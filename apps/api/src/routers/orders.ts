import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { coupons, couponUsages, customers, integrations, orderLineItems, orders, shippingRates, variants } from "@kasify/db";
import { protectedProcedure, adminProcedure, publicProcedure, router } from "../trpc";
import { sendTransactional } from "../lib/email";
import { LIMITS } from "../lib/rateLimiter";
import { verifyPaystackPayment } from "../lib/paystack";

export const ordersRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["pending", "processing", "shipped", "delivered", "cancelled", "refunded"])
          .optional(),
        financialStatus: z
          .enum(["pending", "paid", "refunded", "partially_refunded", "failed"])
          .optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(orders.tenantId, ctx.tenantId)];
      if (input.status) conditions.push(eq(orders.status, input.status));
      if (input.financialStatus) conditions.push(eq(orders.financialStatus, input.financialStatus));

      const rows = await ctx.db
        .select()
        .from(orders)
        .where(and(...conditions))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .select()
        .from(orders)
        .where(and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId)))
        .limit(1);

      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      const lineItems = await ctx.db
        .select()
        .from(orderLineItems)
        .where(eq(orderLineItems.orderId, order.id));

      return { ...order, lineItems };
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(orders)
        .set({ status: input.status, updatedAt: new Date() })
        .where(and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      // Send shipping update email when status changes to shipped
      if (input.status === "shipped" && updated.customerEmail) {
        const addr = updated.shippingAddress as { firstName?: string; lastName?: string } | null;
        const customerName = addr?.firstName
          ? `${addr.firstName} ${addr.lastName ?? ""}`.trim()
          : updated.customerEmail;
        sendTransactional({
          db: ctx.db,
          tenantId: ctx.tenantId,
          to: updated.customerEmail,
          type: "shipping_update",
          vars: {
            customer_name: customerName,
            order_number: String(updated.orderNumber),
            order_total: `R ${Number(updated.total).toFixed(2)}`,
            order_status: "Shipped",
          },
        }).catch(() => {/* non-fatal */});
      }

      return updated;
    }),

  getDetail: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .select()
        .from(orders)
        .where(and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId)))
        .limit(1);

      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      const lineItems = await ctx.db
        .select()
        .from(orderLineItems)
        .where(eq(orderLineItems.orderId, order.id));

      let customer = null;
      if (order.customerId) {
        const [row] = await ctx.db
          .select()
          .from(customers)
          .where(eq(customers.id, order.customerId))
          .limit(1);
        customer = row ?? null;
      }

      return { ...order, lineItems, customer };
    }),

  addTracking: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        trackingNumber: z.string().min(1),
        trackingCarrier: z.string().optional(),
        fulfillmentNotes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(orders)
        .set({
          trackingNumber: input.trackingNumber,
          trackingCarrier: input.trackingCarrier ?? null,
          ...(input.fulfillmentNotes !== undefined ? { fulfillmentNotes: input.fulfillmentNotes } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      // Send tracking email if order has a customer email
      if (updated.customerEmail && updated.trackingNumber) {
        const addr = updated.shippingAddress as { firstName?: string; lastName?: string } | null;
        const customerName = addr?.firstName
          ? `${addr.firstName} ${addr.lastName ?? ""}`.trim()
          : updated.customerEmail;
        sendTransactional({
          db: ctx.db,
          tenantId: ctx.tenantId,
          to: updated.customerEmail,
          type: "shipping_update",
          vars: {
            customer_name: customerName,
            order_number: String(updated.orderNumber),
            order_total: `R ${Number(updated.total).toFixed(2)}`,
            order_status: "Shipped",
            tracking_number: updated.trackingNumber,
            tracking_carrier: updated.trackingCarrier ?? "",
          },
        }).catch(() => {/* non-fatal */});
      }

      return updated;
    }),

  cancel: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        fulfillmentNotes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .select()
        .from(orders)
        .where(and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId)))
        .limit(1);

      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (order.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "Order is already cancelled" });
      if (order.status === "delivered") throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot cancel a delivered order" });

      // Restore inventory
      const lineItems = await ctx.db
        .select()
        .from(orderLineItems)
        .where(eq(orderLineItems.orderId, order.id));

      for (const item of lineItems) {
        if (item.variantId) {
          await ctx.db
            .update(variants)
            .set({ inventory: sql`${variants.inventory} + ${item.quantity}` })
            .where(eq(variants.id, item.variantId));
        }
      }

      const [updated] = await ctx.db
        .update(orders)
        .set({
          status: "cancelled",
          fulfillmentNotes: input.fulfillmentNotes ?? order.fulfillmentNotes,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id))
        .returning();

      return updated!;
    }),

  updateFulfillmentNotes: adminProcedure
    .input(z.object({ id: z.string().uuid(), fulfillmentNotes: z.string().max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(orders)
        .set({ fulfillmentNotes: input.fulfillmentNotes, updatedAt: new Date() })
        .where(and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  // Public: create an order from a cart submission
  create: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        customerEmail: z.string().email(),
        customerFirstName: z.string().min(1),
        customerLastName: z.string().min(1),
        customerPhone: z.string().optional(),
        shippingAddress: z.object({
          firstName: z.string(),
          lastName: z.string(),
          address1: z.string(),
          address2: z.string().optional(),
          city: z.string(),
          province: z.string().optional(),
          postalCode: z.string(),
          country: z.string(),
        }),
        shippingRateId: z.string().uuid().optional(),
        couponCode: z.string().optional(),
        note: z.string().optional(),
        paystackReference: z.string().optional(),
        items: z.array(
          z.object({
            variantId: z.string().uuid(),
            title: z.string(),
            variantTitle: z.string().optional(),
            sku: z.string().optional(),
            quantity: z.number().int().min(1),
            unitPrice: z.number(),
            imageUrl: z.string().optional(),
          }),
        ).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Validate inventory for all items
      for (const item of input.items) {
        const [variant] = await ctx.db
          .select({ inventory: variants.inventory, price: variants.price })
          .from(variants)
          .where(eq(variants.id, item.variantId))
          .limit(1);
        if (!variant) throw new TRPCError({ code: "BAD_REQUEST", message: `Variant not found: ${item.variantId}` });
        if (variant.inventory !== null && variant.inventory < item.quantity) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Insufficient stock for ${item.title}` });
        }
      }

      // 2. Resolve shipping rate
      let shippingTotal = 0;
      let shippingRateName: string | undefined;
      if (input.shippingRateId) {
        const [rate] = await ctx.db
          .select()
          .from(shippingRates)
          .where(and(eq(shippingRates.id, input.shippingRateId), eq(shippingRates.tenantId, input.tenantId)))
          .limit(1);
        if (rate) {
          shippingTotal = Number(rate.price);
          shippingRateName = rate.name;
        }
      }

      // 3. Validate coupon if provided
      let discountTotal = 0;
      let resolvedCoupon: typeof coupons.$inferSelect | null = null;
      if (input.couponCode) {
        const [coupon] = await ctx.db
          .select()
          .from(coupons)
          .where(
            and(
              eq(coupons.tenantId, input.tenantId),
              eq(sql`lower(${coupons.code})`, input.couponCode.toLowerCase()),
              eq(coupons.isActive, true),
            ),
          )
          .limit(1);

        if (!coupon) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired coupon code" });
        if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Coupon has expired" });

        // Atomic reserve: increment usedCount only if still under maxUses.
        // This eliminates the race condition from a separate check+increment.
        const [reserved] = await ctx.db
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(
            and(
              eq(coupons.id, coupon.id),
              coupon.maxUses !== null
                ? sql`${coupons.usedCount} < ${coupon.maxUses}`
                : sql`true`,
            ),
          )
          .returning();

        if (!reserved) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Coupon usage limit reached" });
        }
        resolvedCoupon = reserved;
      }

      // 4. Calculate totals
      const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

      if (resolvedCoupon) {
        const minAmount = resolvedCoupon.minOrderAmount ? Number(resolvedCoupon.minOrderAmount) : 0;
        if (subtotal < minAmount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Minimum order amount for this coupon is ${minAmount}` });
        }
        if (resolvedCoupon.type === "percentage") {
          discountTotal = Math.round(subtotal * (Number(resolvedCoupon.value) / 100) * 100) / 100;
        } else if (resolvedCoupon.type === "fixed_amount") {
          discountTotal = Math.min(Number(resolvedCoupon.value), subtotal);
        } else if (resolvedCoupon.type === "free_shipping") {
          shippingTotal = 0;
        }
      }

      const total = Math.max(0, subtotal - discountTotal + shippingTotal);

      // 4b. Verify Paystack payment if reference provided
      let financialStatus: "pending" | "paid" | "failed" = "pending";
      if (input.paystackReference) {
        // Look up tenant's Paystack secret key from their integrations
        const [integration] = await ctx.db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.tenantId, input.tenantId),
              eq(integrations.provider, "paystack" as "stripe"),
              eq(integrations.isEnabled, true),
            ),
          )
          .limit(1);

        const secretKey = (integration?.config as Record<string, string> | undefined)?.["secretKey"];
        if (!secretKey) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment configuration error. Please contact the store." });
        }

        const payment = await verifyPaystackPayment(input.paystackReference, secretKey);
        if (payment.status !== "success") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment was not successful. Please try again." });
        }
        const expectedKobo = Math.round(total * 100);
        if (Math.abs(payment.amount - expectedKobo) > 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment amount mismatch. Please contact support." });
        }
        financialStatus = "paid";
      }

      // 5. Upsert customer
      const [existingCustomer] = await ctx.db
        .select()
        .from(customers)
        .where(and(eq(customers.tenantId, input.tenantId), eq(customers.email, input.customerEmail)))
        .limit(1);

      let customerId: string;
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const [newCustomer] = await ctx.db
          .insert(customers)
          .values({
            tenantId: input.tenantId,
            email: input.customerEmail,
            firstName: input.customerFirstName,
            lastName: input.customerLastName,
            phone: input.customerPhone,
          })
          .returning();
        if (!newCustomer) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        customerId = newCustomer.id;
      }

      // 6. Create order
      const [order] = await ctx.db
        .insert(orders)
        .values({
          tenantId: input.tenantId,
          customerId,
          customerEmail: input.customerEmail,
          subtotal: subtotal.toFixed(2),
          discountTotal: discountTotal.toFixed(2),
          couponCode: input.couponCode,
          shippingTotal: shippingTotal.toFixed(2),
          taxTotal: "0",
          total: total.toFixed(2),
          shippingAddress: input.shippingAddress,
          note: input.note,
          financialStatus,
          paystackReference: input.paystackReference,
          metadata: shippingRateName ? { shippingRateName } : undefined,
        })
        .returning();
      if (!order) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 7. Insert line items
      await ctx.db.insert(orderLineItems).values(
        input.items.map((item) => ({
          orderId: order.id,
          tenantId: input.tenantId,
          variantId: item.variantId,
          title: item.title,
          variantTitle: item.variantTitle,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          totalPrice: (item.unitPrice * item.quantity).toFixed(2),
        })),
      );

      // 8. Deduct inventory
      for (const item of input.items) {
        await ctx.db
          .update(variants)
          .set({ inventory: sql`GREATEST(0, ${variants.inventory} - ${item.quantity})` })
          .where(eq(variants.id, item.variantId));
      }

      // 9. Update customer totals
      await ctx.db
        .update(customers)
        .set({
          totalOrders: sql`${customers.totalOrders} + 1`,
          totalSpent: sql`${customers.totalSpent} + ${total.toFixed(2)}`,
          firstName: input.customerFirstName,
          lastName: input.customerLastName,
        })
        .where(eq(customers.id, customerId));

      // 10. Record coupon usage (usedCount already incremented atomically in step 3)
      if (resolvedCoupon) {
        await ctx.db.insert(couponUsages).values({
          couponId: resolvedCoupon.id,
          orderId: order.id,
          customerEmail: input.customerEmail,
          discountAmount: discountTotal.toFixed(2),
        });
      }

      // 11. Send order confirmation email (fire-and-forget)
      sendTransactional({
        db: ctx.db,
        tenantId: input.tenantId,
        to: input.customerEmail,
        type: "order_confirmation",
        vars: {
          customer_name: `${input.customerFirstName} ${input.customerLastName}`.trim(),
          order_number: String(order.orderNumber),
          order_total: `R ${total.toFixed(2)}`,
          order_status: "Processing",
        },
      }).catch(() => {/* non-fatal */});

      return { orderNumber: order.orderNumber, orderId: order.id };
    }),

  // Public: look up an order by number + email (for confirmation page)
  getByNumber: publicProcedure
    .input(z.object({ tenantId: z.string().uuid(), orderNumber: z.number().int(), email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      LIMITS.lookup(ctx.ip, "orders.getByNumber");
      const [order] = await ctx.db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.tenantId, input.tenantId),
            eq(orders.orderNumber, input.orderNumber),
            eq(orders.customerEmail, input.email),
          ),
        )
        .limit(1);

      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      const lineItems = await ctx.db
        .select()
        .from(orderLineItems)
        .where(eq(orderLineItems.orderId, order.id));

      return { ...order, lineItems };
    }),

  customers: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(customers)
        .where(eq(customers.tenantId, ctx.tenantId))
        .orderBy(desc(customers.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  customerDetail: protectedProcedure
    .input(z.object({ customerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [customer] = await ctx.db
        .select()
        .from(customers)
        .where(and(eq(customers.id, input.customerId), eq(customers.tenantId, ctx.tenantId)))
        .limit(1);

      if (!customer) throw new TRPCError({ code: "NOT_FOUND" });

      const customerOrders = await ctx.db
        .select()
        .from(orders)
        .where(and(eq(orders.customerId, customer.id), eq(orders.tenantId, ctx.tenantId)))
        .orderBy(desc(orders.createdAt))
        .limit(20);

      const ordersWithItems = await Promise.all(
        customerOrders.map(async (order) => {
          const lineItems = await ctx.db
            .select()
            .from(orderLineItems)
            .where(eq(orderLineItems.orderId, order.id));
          return { ...order, lineItems };
        }),
      );

      const avgOrderValue =
        customerOrders.length > 0
          ? Number(customer.totalSpent) / customerOrders.length
          : 0;

      return {
        ...customer,
        defaultAddress: customer.defaultAddress ?? null,
        orders: ordersWithItems,
        avgOrderValue,
      };
    }),

  updateCustomerNote: adminProcedure
    .input(z.object({ customerId: z.string().uuid(), note: z.string().max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(customers)
        .set({ metadata: { note: input.note } } as any)
        .where(and(eq(customers.id, input.customerId), eq(customers.tenantId, ctx.tenantId)))
        .returning();
      return updated;
    }),
});
