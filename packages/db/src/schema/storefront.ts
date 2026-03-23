import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";

export const themes = pgTable("themes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  settings: jsonb("settings")
    .$type<{
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      fontHeading: string;
      fontBody: string;
      borderRadius: string;
    }>()
    .notNull()
    .default({
      primaryColor: "#000000",
      secondaryColor: "#ffffff",
      accentColor: "#3b82f6",
      fontHeading: "Inter",
      fontBody: "Inter",
      borderRadius: "0.5rem",
    }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  themeId: uuid("theme_id")
    .notNull()
    .references(() => themes.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  type: text("type", { enum: ["home", "product", "collection", "blog", "custom", "404"] })
    .notNull()
    .default("custom"),
  mode: text("mode", { enum: ["visual", "code"] }).notNull().default("visual"),
  // Craft.js serialized node tree (visual mode)
  content: jsonb("content"),
  // Raw HTML/CSS/JS (code mode)
  customCode: jsonb("custom_code").$type<{
    html: string;
    css: string;
    js: string;
  }>(),
  isPublished: boolean("is_published").notNull().default(false),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const themesRelations = relations(themes, ({ one, many }) => ({
  tenant: one(tenants, { fields: [themes.tenantId], references: [tenants.id] }),
  pages: many(pages),
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  tenant: one(tenants, { fields: [pages.tenantId], references: [tenants.id] }),
  theme: one(themes, { fields: [pages.themeId], references: [themes.id] }),
}));
