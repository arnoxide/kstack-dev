import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { shippingRates } from "@kasify/db";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../trpc";

export const shippingRouter = router({
  // Public: get applicable shipping rates for a given order subtotal
  rates: publicProcedure
    .input(z.object({ tenantId: z.string().uuid(), subtotal: z.number() }))
    .query(async ({ ctx, input }) => {
      const rates = await ctx.db
        .select()
        .from(shippingRates)
        .where(and(eq(shippingRates.tenantId, input.tenantId), eq(shippingRates.isActive, true)))
        .orderBy(asc(shippingRates.sortOrder));

      return rates.map((rate) => {
        // free_over: show as free if subtotal qualifies, otherwise hide it
        if (rate.type === "free_over") {
          const threshold = Number(rate.minOrderAmount ?? 0);
          if (input.subtotal < threshold) return null; // not eligible yet
          return { ...rate, price: "0" };
        }
        return rate;
      }).filter(Boolean) as (typeof shippingRates.$inferSelect)[];
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(shippingRates)
      .where(eq(shippingRates.tenantId, ctx.tenantId))
      .orderBy(asc(shippingRates.sortOrder));
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["flat_rate", "free_over", "free"]),
        price: z.number().min(0),
        minOrderAmount: z.number().min(0).optional(),
        estimatedDays: z.string().optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(shippingRates)
        .values({
          tenantId: ctx.tenantId,
          name: input.name,
          type: input.type,
          price: input.price.toFixed(2),
          minOrderAmount: input.minOrderAmount?.toFixed(2),
          estimatedDays: input.estimatedDays,
          isActive: input.isActive,
        })
        .returning();
      return created;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        price: z.number().min(0).optional(),
        minOrderAmount: z.number().min(0).nullable().optional(),
        estimatedDays: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, price, minOrderAmount, ...rest } = input;
      const [updated] = await ctx.db
        .update(shippingRates)
        .set({
          ...rest,
          ...(price !== undefined && { price: price.toFixed(2) }),
          ...(minOrderAmount !== undefined && { minOrderAmount: minOrderAmount != null ? minOrderAmount.toFixed(2) : null }),
        })
        .where(and(eq(shippingRates.id, id), eq(shippingRates.tenantId, ctx.tenantId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(shippingRates)
        .where(and(eq(shippingRates.id, input.id), eq(shippingRates.tenantId, ctx.tenantId)));
      return { success: true };
    }),
});
