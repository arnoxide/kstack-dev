import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
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
});
