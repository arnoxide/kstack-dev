import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, signAccessToken, verifyPassword } from "@kasify/auth";
import { customers, orderLineItems, orders } from "@kasify/db";
import { publicProcedure, customerProcedure, router } from "../trpc";
import { LIMITS } from "../lib/rateLimiter";

export const customerAuthRouter = router({
  register: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      LIMITS.register(ctx.ip, `customerAuth.register:${input.tenantId}`);

      const [existing] = await ctx.db
        .select()
        .from(customers)
        .where(and(eq(customers.tenantId, input.tenantId), eq(customers.email, input.email)))
        .limit(1);

      // Block registration if any record (guest or full account) already exists for this email.
      // This prevents guest account takeover via the register endpoint.
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists" });
      }

      const passwordHash = await hashPassword(input.password);

      const [created] = await ctx.db
        .insert(customers)
        .values({
          tenantId: input.tenantId,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          passwordHash,
        })
        .returning();
      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const customerId = created.id;

      const token = await signAccessToken({
        sub: customerId,
        email: input.email,
        tenantId: input.tenantId,
        role: "customer",
      });

      return { token, customerId };
    }),

  login: publicProcedure
    .input(z.object({ tenantId: z.string().uuid(), email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      LIMITS.auth(ctx.ip, `customerAuth.login:${input.tenantId}`);
      const [customer] = await ctx.db
        .select()
        .from(customers)
        .where(and(eq(customers.tenantId, input.tenantId), eq(customers.email, input.email)))
        .limit(1);

      if (!customer || !customer.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      const valid = await verifyPassword(input.password, customer.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      const token = await signAccessToken({
        sub: customer.id,
        email: customer.email,
        tenantId: input.tenantId,
        role: "customer",
      });

      return {
        token,
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          totalOrders: customer.totalOrders,
          totalSpent: customer.totalSpent,
        },
      };
    }),

  me: customerProcedure.query(async ({ ctx }) => {
    const [customer] = await ctx.db
      .select()
      .from(customers)
      .where(eq(customers.id, ctx.customerId))
      .limit(1);

    if (!customer) throw new TRPCError({ code: "NOT_FOUND" });

    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      totalOrders: customer.totalOrders,
      totalSpent: Number(customer.totalSpent),
      defaultAddress: customer.defaultAddress ?? null,
    };
  }),

  saveAddress: customerProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        address1: z.string().min(1),
        address2: z.string().optional(),
        city: z.string().min(1),
        province: z.string().optional(),
        postalCode: z.string().min(1),
        country: z.string().min(1),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(customers)
        .set({
          defaultAddress: {
            firstName: input.firstName,
            lastName: input.lastName,
            address1: input.address1,
            city: input.city,
            postalCode: input.postalCode,
            country: input.country,
            isDefault: true,
            ...(input.address2 !== undefined ? { address2: input.address2 } : {}),
            ...(input.province !== undefined ? { province: input.province } : {}),
            ...(input.phone !== undefined ? { phone: input.phone } : {}),
          },
        })
        .where(eq(customers.id, ctx.customerId))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated.defaultAddress;
    }),

  removeAddress: customerProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(customers)
      .set({ defaultAddress: null })
      .where(eq(customers.id, ctx.customerId));
    return { success: true };
  }),

  updateProfile: customerProcedure
    .input(z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(customers)
        .set({ ...input })
        .where(eq(customers.id, ctx.customerId))
        .returning();
      return updated;
    }),

  changePassword: customerProcedure
    .input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      const [customer] = await ctx.db
        .select()
        .from(customers)
        .where(eq(customers.id, ctx.customerId))
        .limit(1);

      if (!customer?.passwordHash) throw new TRPCError({ code: "NOT_FOUND" });

      const valid = await verifyPassword(input.currentPassword, customer.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });

      const passwordHash = await hashPassword(input.newPassword);
      await ctx.db.update(customers).set({ passwordHash }).where(eq(customers.id, ctx.customerId));
      return { success: true };
    }),

  myOrders: customerProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const [customer] = await ctx.db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, ctx.customerId))
        .limit(1);

      if (!customer) throw new TRPCError({ code: "NOT_FOUND" });

      const orderRows = await ctx.db
        .select()
        .from(orders)
        .where(and(eq(orders.customerId, customer.id), eq(orders.tenantId, ctx.tenantId)))
        .orderBy(desc(orders.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const withItems = await Promise.all(
        orderRows.map(async (order) => {
          const lineItems = await ctx.db
            .select()
            .from(orderLineItems)
            .where(eq(orderLineItems.orderId, order.id));
          return { ...order, lineItems };
        }),
      );

      return withItems;
    }),
});
