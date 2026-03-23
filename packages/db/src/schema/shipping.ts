import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";

export const shippingRates = pgTable("shipping_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // flat_rate: fixed price; free_over: free when order >= minOrderAmount; free: always free
  type: text("type", { enum: ["flat_rate", "free_over", "free"] }).notNull().default("flat_rate"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  // For free_over type: free shipping threshold
  minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }),
  estimatedDays: text("estimated_days"), // e.g. "3-5 business days"
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: numeric("sort_order").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shippingRatesRelations = relations(shippingRates, ({ one }) => ({
  tenant: one(tenants, { fields: [shippingRates.tenantId], references: [tenants.id] }),
}));

export type ShippingRate = typeof shippingRates.$inferSelect;
