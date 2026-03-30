// Module: KStack_Platform
import { text, pgTable, timestamp } from "drizzle-orm/pg-core";

// General key/value config store for the framework instance
// (e.g. storing feature flags or install metadata)
export const frameworkConfig = pgTable("framework_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
