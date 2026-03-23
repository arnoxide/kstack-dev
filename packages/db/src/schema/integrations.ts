import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";

export const INTEGRATION_PROVIDERS = [
  // Payments
  "stripe",
  "paystack",
  "payfast",
  "yoco",
  "paypal",
  // Shipping
  "the_courier_guy",
  "aramex",
  "dhl",
  "fastway",
  // Marketing
  "mailchimp",
  "klaviyo",
  "sendgrid",
  // Analytics
  "google_analytics",
  "facebook_pixel",
  "hotjar",
  "tiktok_pixel",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  provider: text("provider").$type<IntegrationProvider>().notNull(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  // Stores API keys, IDs etc. — encrypt in production
  config: jsonb("config").$type<Record<string, string>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const integrationsRelations = relations(integrations, ({ one }) => ({
  tenant: one(tenants, { fields: [integrations.tenantId], references: [tenants.id] }),
}));
