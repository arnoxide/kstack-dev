import { TRPCError } from "@trpc/server";
import { and, avg, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { products, reviews } from "@kasify/db";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../trpc";

export const reviewsRouter = router({
  // Public: list approved reviews for a product
  list: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        productId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.tenantId, input.tenantId),
            eq(reviews.productId, input.productId),
            eq(reviews.isApproved, true),
          ),
        )
        .orderBy(desc(reviews.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [stats] = await ctx.db
        .select({ avgRating: avg(reviews.rating), total: count() })
        .from(reviews)
        .where(
          and(
            eq(reviews.tenantId, input.tenantId),
            eq(reviews.productId, input.productId),
            eq(reviews.isApproved, true),
          ),
        );

      return {
        reviews: rows,
        avgRating: stats?.avgRating ? Number(stats.avgRating) : null,
        total: stats?.total ?? 0,
      };
    }),

  // Public: submit a review
  create: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        productId: z.string().uuid(),
        customerEmail: z.string().email(),
        customerName: z.string().min(1),
        rating: z.number().int().min(1).max(5),
        title: z.string().max(120).optional(),
        body: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify product belongs to tenant
      const [product] = await ctx.db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, input.productId), eq(products.tenantId, input.tenantId)))
        .limit(1);
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });

      const [created] = await ctx.db
        .insert(reviews)
        .values({
          tenantId: input.tenantId,
          productId: input.productId,
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          rating: input.rating,
          title: input.title,
          body: input.body,
          isApproved: false, // requires admin approval
        })
        .returning();
      return created;
    }),

  // Admin: list all reviews (including unapproved)
  adminList: protectedProcedure
    .input(z.object({ isApproved: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(reviews.tenantId, ctx.tenantId)];
      if (input.isApproved !== undefined) conditions.push(eq(reviews.isApproved, input.isApproved));
      return ctx.db
        .select()
        .from(reviews)
        .where(and(...conditions))
        .orderBy(desc(reviews.createdAt));
    }),

  // Admin: approve or reject a review
  moderate: adminProcedure
    .input(z.object({ id: z.string().uuid(), isApproved: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(reviews)
        .set({ isApproved: input.isApproved })
        .where(and(eq(reviews.id, input.id), eq(reviews.tenantId, ctx.tenantId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(reviews)
        .where(and(eq(reviews.id, input.id), eq(reviews.tenantId, ctx.tenantId)));
      return { success: true };
    }),
});
