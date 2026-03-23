import { TRPCError } from "@trpc/server";
import { and, eq, asc } from "drizzle-orm";
import { z } from "zod";
import { collections, collectionProducts, products } from "@kasify/db";
import { protectedProcedure, adminProcedure, router } from "../trpc";

export const collectionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(collections)
      .where(eq(collections.tenantId, ctx.tenantId))
      .orderBy(asc(collections.createdAt));

    // Attach product count to each collection
    return Promise.all(
      rows.map(async (col) => {
        const members = await ctx.db
          .select({ productId: collectionProducts.productId })
          .from(collectionProducts)
          .where(eq(collectionProducts.collectionId, col.id));
        return { ...col, productCount: members.length };
      }),
    );
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [col] = await ctx.db
        .select()
        .from(collections)
        .where(and(eq(collections.id, input.id), eq(collections.tenantId, ctx.tenantId)))
        .limit(1);
      if (!col) throw new TRPCError({ code: "NOT_FOUND" });

      const members = await ctx.db
        .select({ productId: collectionProducts.productId, sortOrder: collectionProducts.sortOrder })
        .from(collectionProducts)
        .where(eq(collectionProducts.collectionId, col.id))
        .orderBy(asc(collectionProducts.sortOrder));

      const productIds = members.map((m) => m.productId);
      const productRows = productIds.length
        ? await ctx.db
            .select({ id: products.id, title: products.title, status: products.status })
            .from(products)
            .where(and(eq(products.tenantId, ctx.tenantId)))
        : [];

      return {
        ...col,
        products: productRows.filter((p) => productIds.includes(p.id)),
      };
    }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        handle: z.string().min(1).regex(/^[a-z0-9-]+$/, "Handle must be lowercase letters, numbers and hyphens only"),
        description: z.string().optional(),
        imageUrl: z.string().url().optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: collections.id })
        .from(collections)
        .where(and(eq(collections.tenantId, ctx.tenantId), eq(collections.handle, input.handle)))
        .limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "A collection with this handle already exists" });

      const [created] = await ctx.db
        .insert(collections)
        .values({
          tenantId: ctx.tenantId,
          title: input.title,
          handle: input.handle,
          description: input.description,
          imageUrl: input.imageUrl || null,
        })
        .returning();
      return created;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      const [updated] = await ctx.db
        .update(collections)
        .set({ ...fields, imageUrl: fields.imageUrl || null, updatedAt: new Date() })
        .where(and(eq(collections.id, id), eq(collections.tenantId, ctx.tenantId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(collections)
        .where(and(eq(collections.id, input.id), eq(collections.tenantId, ctx.tenantId)));
    }),

  // Add a product to a collection
  addProduct: adminProcedure
    .input(z.object({ collectionId: z.string().uuid(), productId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check both belong to this tenant
      const [col] = await ctx.db.select({ id: collections.id }).from(collections)
        .where(and(eq(collections.id, input.collectionId), eq(collections.tenantId, ctx.tenantId))).limit(1);
      if (!col) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .insert(collectionProducts)
        .values({ collectionId: input.collectionId, productId: input.productId, tenantId: ctx.tenantId })
        .onConflictDoNothing();
    }),

  // Remove a product from a collection
  removeProduct: adminProcedure
    .input(z.object({ collectionId: z.string().uuid(), productId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(collectionProducts)
        .where(
          and(
            eq(collectionProducts.collectionId, input.collectionId),
            eq(collectionProducts.productId, input.productId),
          ),
        );
    }),

  // List all tenant products (for the add-to-collection picker)
  availableProducts: protectedProcedure
    .input(z.object({ collectionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const allProducts = await ctx.db
        .select({ id: products.id, title: products.title, status: products.status })
        .from(products)
        .where(eq(products.tenantId, ctx.tenantId))
        .orderBy(asc(products.title));

      const members = await ctx.db
        .select({ productId: collectionProducts.productId })
        .from(collectionProducts)
        .where(eq(collectionProducts.collectionId, input.collectionId));

      const memberIds = new Set(members.map((m) => m.productId));

      return allProducts.map((p) => ({ ...p, inCollection: memberIds.has(p.id) }));
    }),
});
