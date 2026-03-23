import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { coupons } from "@kasify/db";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../trpc";

export const couponsRouter = router({
  // Public: validate a coupon code and return discount info
  validate: publicProcedure
    .input(z.object({ tenantId: z.string().uuid(), code: z.string().min(1), subtotal: z.number() }))
    .query(async ({ ctx, input }) => {
      const [coupon] = await ctx.db
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.tenantId, input.tenantId),
            eq(sql`lower(${coupons.code})`, input.code.toLowerCase()),
            eq(coupons.isActive, true),
          ),
        )
        .limit(1);

      if (!coupon) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid coupon code" });
      if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Coupon has expired" });
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new TRPCError({ code: "BAD_REQUEST", message: "Coupon usage limit reached" });

      const minAmount = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;
      if (input.subtotal < minAmount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Minimum order of ${minAmount} required` });
      }

      let discountAmount = 0;
      if (coupon.type === "percentage") {
        discountAmount = Math.round(input.subtotal * (Number(coupon.value) / 100) * 100) / 100;
      } else if (coupon.type === "fixed_amount") {
        discountAmount = Math.min(Number(coupon.value), input.subtotal);
      } else if (coupon.type === "free_shipping") {
        discountAmount = 0; // applied as shipping = 0
      }

      return {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        discountAmount,
        freeShipping: coupon.type === "free_shipping",
      };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(coupons)
      .where(eq(coupons.tenantId, ctx.tenantId))
      .orderBy(coupons.createdAt);
  }),

  create: adminProcedure
    .input(
      z.object({
        code: z.string().min(1).max(50),
        type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
        value: z.number().min(0),
        minOrderAmount: z.number().min(0).optional(),
        maxUses: z.number().int().min(1).optional(),
        expiresAt: z.string().datetime().optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(coupons)
        .values({
          tenantId: ctx.tenantId,
          code: input.code.toUpperCase(),
          type: input.type,
          value: input.value.toFixed(2),
          minOrderAmount: input.minOrderAmount?.toFixed(2),
          maxUses: input.maxUses,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
          isActive: input.isActive,
        })
        .returning();
      return created;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        isActive: z.boolean().optional(),
        maxUses: z.number().int().min(1).nullable().optional(),
        expiresAt: z.string().datetime().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [updated] = await ctx.db
        .update(coupons)
        .set({
          ...(rest.isActive !== undefined && { isActive: rest.isActive }),
          ...(rest.maxUses !== undefined && { maxUses: rest.maxUses }),
          ...(rest.expiresAt !== undefined && { expiresAt: rest.expiresAt ? new Date(rest.expiresAt) : null }),
        })
        .where(and(eq(coupons.id, id), eq(coupons.tenantId, ctx.tenantId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(coupons)
        .where(and(eq(coupons.id, input.id), eq(coupons.tenantId, ctx.tenantId)));
      return { success: true };
    }),
});
