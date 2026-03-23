import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { products } from "./products";

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  rating: integer("rating").notNull(), // 1–5
  title: text("title"),
  body: text("body"),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  tenant: one(tenants, { fields: [reviews.tenantId], references: [tenants.id] }),
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}));

export type Review = typeof reviews.$inferSelect;
