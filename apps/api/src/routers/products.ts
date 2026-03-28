import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { productImages, products, variants } from "@kstack/db";
import { CreateProductSchema, CreateVariantSchema } from "@kstack/types";
import { protectedProcedure, router } from "../trpc";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const productsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["draft", "active", "archived"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(products.tenantId, ctx.tenantId)];
      if (input.status) {
        conditions.push(eq(products.status, input.status));
      }

      const rows = await ctx.db
        .select()
        .from(products)
        .where(and(...conditions))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [product] = await ctx.db
        .select()
        .from(products)
        .where(and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId)))
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

  create: protectedProcedure.input(CreateProductSchema).mutation(async ({ ctx, input }) => {
    const handle = input.handle ?? slugify(input.title);

    const [product] = await ctx.db
      .insert(products)
      .values({
        tenantId: ctx.tenantId,
        title: input.title,
        description: input.description ?? null,
        handle,
        status: input.status ?? "draft",
        tags: input.tags ?? [],
        isRecommended: input.isRecommended,
        goesWithIds: input.goesWithIds,
      })
      .returning();

    if (!product) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Create a default variant
    await ctx.db.insert(variants).values({
      productId: product.id,
      tenantId: ctx.tenantId,
      title: "Default Title",
      price: "0",
      inventory: 0,
    });

    return product;
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: CreateProductSchema.partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(products)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(products)
        .where(and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId)))
        .returning({ id: products.id });

      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  deleteMany: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(products)
        .where(and(inArray(products.id, input.ids), eq(products.tenantId, ctx.tenantId)));
      return { deleted: input.ids.length };
    }),

  createVariant: protectedProcedure
    .input(z.object({ productId: z.string().uuid(), data: CreateVariantSchema }))
    .mutation(async ({ ctx, input }) => {
      // Verify product belongs to tenant
      const [product] = await ctx.db
        .select()
        .from(products)
        .where(and(eq(products.id, input.productId), eq(products.tenantId, ctx.tenantId)))
        .limit(1);

      if (!product) throw new TRPCError({ code: "NOT_FOUND" });

      const [variant] = await ctx.db
        .insert(variants)
        .values({
          productId: input.productId,
          tenantId: ctx.tenantId,
          ...input.data,
          price: String(input.data.price),
          comparePrice: input.data.comparePrice != null ? String(input.data.comparePrice) : null,
        })
        .returning();

      return variant;
    }),

  updateVariant: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: CreateVariantSchema.partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(variants)
        .set({
          ...input.data,
          price: input.data.price != null ? String(input.data.price) : undefined,
          comparePrice:
            input.data.comparePrice != null ? String(input.data.comparePrice) : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(variants.id, input.id), eq(variants.tenantId, ctx.tenantId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  deleteVariant: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(variants)
        .where(and(eq(variants.id, input.id), eq(variants.tenantId, ctx.tenantId)))
        .returning({ id: variants.id });

      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  addImage: protectedProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        url: z.string().url(),
        altText: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const [product] = await ctx.db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, input.productId), eq(products.tenantId, ctx.tenantId)))
        .limit(1);
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });

      // Determine next sortOrder
      const existing = await ctx.db
        .select({ sortOrder: productImages.sortOrder })
        .from(productImages)
        .where(eq(productImages.productId, input.productId));
      const nextOrder = existing.length > 0 ? Math.max(...existing.map((i) => i.sortOrder)) + 1 : 0;

      const [image] = await ctx.db
        .insert(productImages)
        .values({
          tenantId: ctx.tenantId,
          productId: input.productId,
          url: input.url,
          altText: input.altText ?? null,
          sortOrder: nextOrder,
        })
        .returning();

      return image;
    }),

  deleteImage: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(productImages)
        .where(and(eq(productImages.id, input.id), eq(productImages.tenantId, ctx.tenantId)))
        .returning({ id: productImages.id });

      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  importCsv: protectedProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            title: z.string().min(1),
            description: z.string().optional(),
            handle: z.string().optional(),
            status: z.enum(["draft", "active", "archived"]).default("draft"),
            tags: z.string().optional(),
            price: z.number().min(0),
            comparePrice: z.number().optional(),
            sku: z.string().optional(),
            inventory: z.number().int().min(0).default(0),
            variantTitle: z.string().optional(),
            imageUrl: z.string().optional(),
            options: z.record(z.string()).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Group rows by handle (multiple rows = multiple variants for one product)
      const groups = new Map<string, typeof input.rows>();
      for (const row of input.rows) {
        const key = row.handle?.trim() || slugify(row.title);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      }

      let created = 0;
      let skipped = 0;

      for (const [handle, rows] of groups) {
        const first = rows[0];
        if (!first) { skipped++; continue; }
        const tags = first.tags
          ? first.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [];

        try {
          const [product] = await ctx.db
            .insert(products)
            .values({
              tenantId: ctx.tenantId,
              title: first.title,
              description: first.description ?? null,
              handle,
              status: first.status ?? "draft",
              tags,
            })
            .returning();

          if (!product) { skipped++; continue; }

          for (const row of rows) {
            await ctx.db.insert(variants).values({
              productId: product.id,
              tenantId: ctx.tenantId,
              title: row.variantTitle?.trim() || "Default Title",
              price: String(row.price),
              comparePrice: row.comparePrice != null ? String(row.comparePrice) : null,
              sku: row.sku?.trim() || null,
              inventory: row.inventory ?? 0,
              imageUrl: row.imageUrl?.trim() || null,
              options: row.options ?? {},
            });
          }

          // Collect unique image URLs from all rows for this product
          const imageUrls = [...new Set(rows.map((r) => r.imageUrl?.trim()).filter((u): u is string => !!u))];
          for (let i = 0; i < imageUrls.length; i++) {
            const url = imageUrls[i];
            if (!url) continue;
            await ctx.db.insert(productImages).values({
              tenantId: ctx.tenantId,
              productId: product.id,
              url,
              altText: first.title,
              sortOrder: i,
            });
          }

          created++;
        } catch {
          skipped++;
        }
      }

      return { created, skipped };
    }),
});
