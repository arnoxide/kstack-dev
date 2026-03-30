import { TRPCError } from "@trpc/server";
import { and, eq, asc, min, desc } from "drizzle-orm";
import { z } from "zod";
import {
  collections,
  collectionProducts,
  contactMessages,
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
import { sendEmail } from "../lib/email";

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

      if (!tenant || tenant.suspendedAt || tenant.frozenAt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found" });
      }

      // Get active theme + its settings
      const [activeTheme] = await ctx.db
        .select()
        .from(themes)
        .where(and(eq(themes.tenantId, tenant.id), eq(themes.isActive, true)))
        .limit(1);

      // Get analytics integrations (only public/safe IDs — no secrets)
      const [gaRow] = await ctx.db
        .select({ config: integrations.config, isEnabled: integrations.isEnabled })
        .from(integrations)
        .where(and(eq(integrations.tenantId, tenant.id), eq(integrations.provider, "google_analytics")))
        .limit(1);

      return {
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          email: tenant.email,
          logoUrl: tenant.logoUrl,
          socialLinks: tenant.socialLinks ?? null,
          contactInfo: tenant.contactInfo ?? null,
          maintenanceMode: tenant.maintenanceMode,
          legalPages: tenant.legalPages ?? null,
        },
        theme: activeTheme ?? null,
        analytics: {
          googleMeasurementId: gaRow?.isEnabled ? (gaRow.config.measurementId ?? null) : null,
        },
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
        isRecommended: z.boolean().optional(),
        onSale: z.boolean().optional(),
        sortBy: z.enum(["newest", "oldest"]).optional(),
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

      // Build filter conditions
      const conditions = [
        eq(products.tenantId, input.tenantId),
        eq(products.status, "active"),
      ];
      if (input.isRecommended) conditions.push(eq(products.isRecommended, true));

      // onSale requires joining variants
      if (input.onSale) {
        const saleProductIds = await ctx.db
          .selectDistinct({ productId: variants.productId })
          .from(variants)
          .where(and(eq(variants.isOnSale, true)));
        const ids = saleProductIds.map((r) => r.productId).filter(Boolean) as string[];
        if (ids.length === 0) return [];
        const { inArray } = await import("drizzle-orm");
        conditions.push(inArray(products.id, ids));
      }

      const order = input.sortBy === "oldest" ? asc(products.createdAt) : desc(products.createdAt);

      const rows = await ctx.db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(order)
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

  // Submit a contact form message — emails the merchant
  contact: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      name: z.string().min(1).max(100),
      email: z.string().email(),
      subject: z.string().min(1).max(200).optional(),
      message: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const [tenant] = await ctx.db
        .select({ email: tenants.email, name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .limit(1);

      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

      const subject = input.subject ? `Contact: ${input.subject}` : `New contact message from ${input.name}`;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827">
          <h2 style="font-size:18px;font-weight:700;margin-bottom:4px">New Contact Message</h2>
          <p style="color:#6b7280;margin-bottom:24px">Someone submitted the contact form on your store.</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;width:120px">From</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600">${input.name}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Email</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb"><a href="mailto:${input.email}" style="color:#2563eb">${input.email}</a></td></tr>
            ${input.subject ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Subject</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb">${input.subject}</td></tr>` : ""}
          </table>
          <div style="margin-top:20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
            <p style="margin:0;white-space:pre-wrap;font-size:14px;line-height:1.6">${input.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>
          <p style="margin-top:24px;font-size:12px;color:#9ca3af">Reply directly to <a href="mailto:${input.email}">${input.email}</a> to respond.</p>
        </div>
      `;

      await Promise.all([
        sendEmail({
          db: ctx.db,
          tenantId: input.tenantId,
          to: tenant.email,
          subject,
          html,
          type: "contact_form",
          metadata: { fromName: input.name, fromEmail: input.email },
        }),
        ctx.db.insert(contactMessages).values({
          tenantId: input.tenantId,
          name: input.name,
          email: input.email,
          ...(input.subject && { subject: input.subject }),
          message: input.message,
        }),
      ]);

      return { ok: true };
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
