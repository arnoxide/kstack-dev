// Module: Kasify_AIAssistant
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";

/** Per-tenant AI configuration */
export const aiSettings = pgTable("ai_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .unique()
    .references(() => tenants.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: ["anthropic", "openai", "gemini", "custom"] }).notNull().default("anthropic"),
  apiKey: text("api_key"),
  model: text("model"),
  /** Base URL for custom OpenAI-compatible providers (Groq, Ollama, Mistral, etc.) */
  customBaseUrl: text("custom_base_url"),
  chatEnabled: boolean("chat_enabled").notNull().default(false),
  descriptionsEnabled: boolean("descriptions_enabled").notNull().default(true),
  recommendationsEnabled: boolean("recommendations_enabled").notNull().default(true),
  /** Optional custom instructions appended to the chatbot system prompt */
  systemPromptExtra: text("system_prompt_extra"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A chat session (one per browser visitor, identified by a random token) */
export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Individual messages within a chat session */
export const aiChatMessages = pgTable("ai_chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => aiChatSessions.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiSettingsRelations = relations(aiSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [aiSettings.tenantId], references: [tenants.id] }),
}));

export const aiChatSessionsRelations = relations(aiChatSessions, ({ many }) => ({
  messages: many(aiChatMessages),
}));

export const aiChatMessagesRelations = relations(aiChatMessages, ({ one }) => ({
  session: one(aiChatSessions, { fields: [aiChatMessages.sessionId], references: [aiChatSessions.id] }),
}));
