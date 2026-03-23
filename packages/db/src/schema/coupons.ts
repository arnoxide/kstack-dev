import { boolean, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { orders } from "./orders";

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  type: text("type", { enum: ["percentage", "fixed_amount", "free_shipping"] })
    .notNull()
    .default("percentage"),
  value: numeric("value", { precision: 10, scale: 2 }).notNull().default("0"),
  minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const couponUsages = pgTable("coupon_usages", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id")
    .notNull()
    .references(() => coupons.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  customerEmail: text("customer_email").notNull(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
});

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  tenant: one(tenants, { fields: [coupons.tenantId], references: [tenants.id] }),
  usages: many(couponUsages),
}));

export const couponUsagesRelations = relations(couponUsages, ({ one }) => ({
  coupon: one(coupons, { fields: [couponUsages.couponId], references: [coupons.id] }),
  order: one(orders, { fields: [couponUsages.orderId], references: [orders.id] }),
}));

export type Coupon = typeof coupons.$inferSelect;
export type CouponType = Coupon["type"];
