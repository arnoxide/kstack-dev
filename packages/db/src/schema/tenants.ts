import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  plan: text("plan", { enum: ["free", "starter", "pro", "enterprise"] })
    .notNull()
    .default("free"),
  email: text("email").notNull(),
  logoUrl: text("logo_url"),
  contactInfo: jsonb("contact_info").$type<{
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    supportEmail?: string;
    businessHours?: string;
  }>(),
  socialLinks: jsonb("social_links").$type<{
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
    whatsapp?: string;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
});

export const domains = pgTable("domains", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  hostname: text("hostname").notNull().unique(),
  verified: boolean("verified").notNull().default(false),
  sslStatus: text("ssl_status", { enum: ["pending", "active", "failed"] })
    .notNull()
    .default("pending"),
  verificationToken: text("verification_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  domains: many(domains),
}));

export const domainsRelations = relations(domains, ({ one }) => ({
  tenant: one(tenants, { fields: [domains.tenantId], references: [tenants.id] }),
}));
