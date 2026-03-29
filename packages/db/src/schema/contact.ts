// Module: KStack_Contact
import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const contactMessageStatusEnum = pgEnum("contact_message_status", ["new", "read", "replied"]);

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  status: contactMessageStatusEnum("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
