import { TRPCError } from "@trpc/server";
import { and, eq, asc, min, desc } from "drizzle-orm";
import { z } from "zod";
import {
  collections,
  collectionProducts,
  domains,
  integrations,
  pages,
  productImages,
  products,
  tenants,
  themes,
  variants,
} from "@kstack/db";

import { publicProcedure, router } from "../trpc";

/**
 * Public storefront router — no auth required.
 * All procedures accept a tenantSlug or tenantId to scope data.
 */
export const publicRouter = router({
  // Resolve a shop by slug or custom hostname
  resolveShop: publicProcedure
    .input(
      z.object({
        slug: z.string().optional(),
        hostname: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!input.slug && !input.hostname) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Provide slug or hostname" });
      }

      let tenant = null;

      if (input.slug) {
        const [row] = await ctx.db
          .select()
          .from(tenants)
          .where(and(eq(tenants.slug, input.slug)))
          .limit(1);
        tenant = row;
      } else if (input.hostname) {
        const [domain] = await ctx.db
          .select({ tenantId: domains.tenantId })
          .from(domains)
          .where(and(eq(domains.hostname, input.hostname), eq(domains.verified, true)))
          .limit(1);

        if (domain) {
          const [row] = await ctx.db
            .select()
            .from(tenants)
            .where(eq(tenants.id, domain.tenantId))
            .limit(1);
          tenant = row;
        }
      }

      if (!tenant || tenant.suspendedAt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found" });
      }

      // Get active theme + its settings
      const [activeTheme] = await ctx.db
        .select()
        .from(themes)
        .where(and(eq(themes.tenantId, tenant.id), eq(themes.isActive, true)))
        .limit(1);

      return {
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          logoUrl: tenant.logoUrl,
        },
        theme: activeTheme ?? null,
      };
    }),

  // Get published pages for a shop
  pages: publicProcedure
    .input(z.object({ tenantId: z.string().uuid(), slug: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(pages.tenantId, input.tenantId),
        eq(pages.isPublished, true),
      ];
      if (input.slug) conditions.push(eq(pages.slug, input.slug));

      return ctx.db.select().from(pages).where(and(...conditions));
    }),

  // List active products — each item includes minPrice and primaryImage
  products: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(24),
        offset: z.number().min(0).default(0),
        collectionHandle: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Helper: enrich a product list with minPrice + primaryImage
      async function enrich(productRows: (typeof products.$inferSelect)[]) {
        return Promise.all(
          productRows.map(async (p) => {
            const [priceRow] = await ctx.db
              .select({ minPrice: min(variants.price) })
              .from(variants)
              .where(eq(variants.productId, p.id));

            const [imageRow] = await ctx.db
              .select({ url: productImages.url })
              .from(productImages)
              .where(eq(productImages.productId, p.id))
              .orderBy(asc(productImages.sortOrder))
              .limit(1);

            return {
              ...p,
              minPrice: priceRow?.minPrice ? Number(priceRow.minPrice) : null,
              primaryImage: imageRow?.url ?? null,
            };
          }),
        );
      }

      // If filtering by collection, join via collectionProducts
      if (input.collectionHandle) {
        const [collection] = await ctx.db
          .select()
          .from(collections)
          .where(
            and(
              eq(collections.tenantId, input.tenantId),
              eq(collections.handle, input.collectionHandle),
            ),
          )
          .limit(1);

        if (!collection) return [];

        const rows = await ctx.db
          .select({ product: products })
          .from(collectionProducts)
          .innerJoin(products, eq(collectionProducts.productId, products.id))
          .where(
            and(
              eq(collectionProducts.tenantId, input.tenantId),
              eq(collectionProducts.collectionId, collection.id),
              eq(products.status, "active"),
            ),
          )
          .limit(input.limit)
          .offset(input.offset);

        return enrich(rows.map((r) => r.product));
      }

      const rows = await ctx.db
        .select()
        .from(products)
        .where(and(eq(products.tenantId, input.tenantId), eq(products.status, "active")))
        .limit(input.limit)
        .offset(input.offset);

      return enrich(rows);
    }),

  // Get a single product by handle with variants + images
  product: publicProcedure
    .input(z.object({ tenantId: z.string().uuid(), handle: z.string() }))
    .query(async ({ ctx, input }) => {
      const [product] = await ctx.db
        .select()
        .from(products)
        .where(
          and(
            eq(products.tenantId, input.tenantId),
            eq(products.handle, input.handle),
            eq(products.status, "active"),
          ),
        )
        .limit(1);

      if (!product) throw new TRPCError({ code: "NOT_FOUND" });

      const productVariants = await ctx.db
        .select()
        .from(variants)
        .where(eq(variants.productId, product.id));

      const images = await ctx.db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id));

      return { ...product, variants: productVariants, images };
    }),

  // List collections
  collections: publicProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(collections)
        .where(eq(collections.tenantId, input.tenantId));
    }),

  // Returns the active payment provider + public key for the storefront checkout
  // Only exposes the public key — never the secret key
  paymentConfig: publicProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const PAYMENT_PROVIDERS = ["paystack", "stripe", "yoco", "payfast", "paypal"] as const;

      for (const provider of PAYMENT_PROVIDERS) {
        const [row] = await ctx.db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.tenantId, input.tenantId),
              eq(integrations.provider, provider as "stripe"),
              eq(integrations.isEnabled, true),
            ),
          )
          .limit(1);

        if (row?.config) {
          const publicKey =
            (row.config as Record<string, string>)["publicKey"] ??
            (row.config as Record<string, string>)["publishableKey"] ??
            null;

          if (publicKey) {
            return { provider, publicKey };
          }
        }
      }

      return null; // No payment integration configured — COD
    }),

  // Get the published home page for a tenant
  homePage: publicProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [page] = await ctx.db
        .select()
        .from(pages)
        .where(
          and(
            eq(pages.tenantId, input.tenantId),
            eq(pages.type, "home"),
            eq(pages.isPublished, true),
          ),
        )
        .limit(1);
      return page ?? null;
    }),

});
