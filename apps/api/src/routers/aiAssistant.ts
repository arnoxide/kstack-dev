// Module: Kasify_AIAssistant
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  aiSettings,
  aiChatSessions,
  aiChatMessages,
  products,
  variants,
  collections,
  collectionProducts,
} from "@kasify/db";
import { protectedProcedure, adminProcedure, publicProcedure, router } from "../trpc";

// ─── Provider config ──────────────────────────────────────────────────────────

type Provider = "anthropic" | "openai" | "gemini" | "custom";

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
  custom: "gpt-4o-mini",
};

// ─── Unified AI call ──────────────────────────────────────────────────────────

async function callAI(opts: {
  provider: Provider;
  apiKey: string;
  model: string;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens: number;
  customBaseUrl?: string | null;
}): Promise<string> {
  const { provider, apiKey, model, system, messages, maxTokens, customBaseUrl } = opts;

  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages,
    });
    return response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
  }

  const baseURL =
    provider === "gemini"
      ? "https://generativelanguage.googleapis.com/v1beta/openai/"
      : provider === "custom"
      ? (customBaseUrl ?? undefined)
      : undefined;

  const client = new OpenAI({ apiKey, baseURL });

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      ...messages,
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

async function testProvider(provider: Provider, apiKey: string, model: string, customBaseUrl?: string | null): Promise<void> {
  await callAI({
    provider,
    apiKey,
    model,
    system: "You are a test assistant.",
    messages: [{ role: "user", content: "Hi" }],
    maxTokens: 10,
    customBaseUrl: customBaseUrl ?? null,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getSettings(db: any, tenantId: string) {
  const [row] = await db
    .select()
    .from(aiSettings)
    .where(eq(aiSettings.tenantId, tenantId))
    .limit(1);
  return row ?? null;
}

/** Build a store-aware system prompt from live product data */
async function buildSystemPrompt(
  db: any,
  tenantId: string,
  storeName: string,
  extra?: string | null,
) {
  const productRows = await db
    .select({
      title: products.title,
      description: products.description,
      handle: products.handle,
      tags: products.tags,
    })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.status, "active")))
    .orderBy(asc(products.title))
    .limit(60);

  const productContext = productRows
    .map((p: any) => {
      const tags = p.tags?.length ? ` [${p.tags.join(", ")}]` : "";
      const desc = p.description ? ` — ${p.description.slice(0, 100)}` : "";
      return `• ${p.title}${desc}${tags} (/products/${p.handle})`;
    })
    .join("\n");

  return [
    `You are a helpful, friendly customer support assistant for ${storeName}.`,
    "",
    "Your role:",
    "- Help customers find products that match their needs",
    "- Answer questions about products, pricing, and the shopping experience",
    "- Guide customers toward making a purchase",
    "- Be concise, warm, and professional (2–4 sentences per reply unless detail is needed)",
    "",
    `Active product catalog (${productRows.length} products):`,
    productContext || "No products listed yet.",
    "",
    "Guidelines:",
    "- Reference exact product names when recommending",
    "- Include the product path (e.g. /products/handle) when mentioning a specific product",
    "- Be honest if you don't know something specific about policies",
    "- Never invent prices or stock levels — say you're not sure and invite them to check the product page",
    extra ? `\nAdditional instructions:\n${extra}` : "",
  ]
    .join("\n")
    .trim();
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const aiAssistantRouter = router({
  // ── Admin: settings ────────────────────────────────────────────────────────

  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const row = await getSettings(ctx.db, ctx.tenantId!);
      if (!row) return null;
      return {
        ...row,
        apiKey: row.apiKey ? `...${row.apiKey.slice(-6)}` : null,
        hasKey: !!row.apiKey,
      };
    }),

    update: adminProcedure
      .input(
        z.object({
          provider: z.enum(["anthropic", "openai", "gemini", "custom"]).optional(),
          apiKey: z.string().optional(),
          model: z.string().optional(),
          customBaseUrl: z.string().url().optional().or(z.literal("")),
          chatEnabled: z.boolean().optional(),
          descriptionsEnabled: z.boolean().optional(),
          recommendationsEnabled: z.boolean().optional(),
          systemPromptExtra: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getSettings(ctx.db, ctx.tenantId!);

        const values: any = {
          tenantId: ctx.tenantId!,
          updatedAt: new Date(),
        };
        if (input.provider !== undefined) values.provider = input.provider;
        if (input.apiKey !== undefined) values.apiKey = input.apiKey || null;
        if (input.model !== undefined) values.model = input.model || null;
        if (input.customBaseUrl !== undefined) values.customBaseUrl = input.customBaseUrl || null;
        if (input.chatEnabled !== undefined) values.chatEnabled = input.chatEnabled;
        if (input.descriptionsEnabled !== undefined) values.descriptionsEnabled = input.descriptionsEnabled;
        if (input.recommendationsEnabled !== undefined) values.recommendationsEnabled = input.recommendationsEnabled;
        if (input.systemPromptExtra !== undefined) values.systemPromptExtra = input.systemPromptExtra || null;

        if (existing) {
          const [updated] = await ctx.db
            .update(aiSettings)
            .set(values)
            .where(eq(aiSettings.id, existing.id))
            .returning();
          return updated;
        }

        const [created] = await ctx.db
          .insert(aiSettings)
          .values(values)
          .returning();
        return created;
      }),

    testConnection: adminProcedure.mutation(async ({ ctx }) => {
      const settings = await getSettings(ctx.db, ctx.tenantId!);
      if (!settings?.apiKey) return { ok: false, error: "No API key configured" };
      try {
        const provider: Provider = settings.provider ?? "anthropic";
        const model = settings.model || DEFAULT_MODELS[provider];
        await testProvider(provider, settings.apiKey, model, settings.customBaseUrl);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.message ?? "Connection failed" };
      }
    }),
  }),

  // ── Admin: generate product description ────────────────────────────────────

  generateDescription: adminProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const settings = await getSettings(ctx.db, ctx.tenantId!);
      if (!settings?.apiKey) throw new Error("AI API key not configured");
      if (!settings.descriptionsEnabled) throw new Error("AI descriptions are disabled");

      const [product] = await ctx.db
        .select()
        .from(products)
        .where(and(eq(products.id, input.productId), eq(products.tenantId, ctx.tenantId!)))
        .limit(1);
      if (!product) throw new Error("Product not found");

      const provider: Provider = settings.provider ?? "anthropic";
      const model = settings.model || DEFAULT_MODELS[provider];
      const tags = product.tags?.length ? `Tags/categories: ${product.tags.join(", ")}` : "";
      const existing = product.description ? `Existing description: ${product.description}` : "";

      const prompt = [
        "Write a compelling, SEO-friendly product description for an e-commerce store.",
        "Be concise (2–3 sentences), highlight key benefits, and use engaging language.",
        "Return only the description text, no extra formatting or labels.",
        "",
        `Product name: ${product.title}`,
        tags,
        existing,
      ]
        .filter(Boolean)
        .join("\n");

      const description = await callAI({
        provider,
        apiKey: settings.apiKey,
        model,
        system: "You are a professional e-commerce copywriter.",
        messages: [{ role: "user", content: prompt }],
        maxTokens: 300,
        customBaseUrl: settings.customBaseUrl,
      });

      await ctx.db
        .update(products)
        .set({ description, updatedAt: new Date() })
        .where(eq(products.id, input.productId));

      return { description };
    }),

  // ── Public: is chat enabled for this tenant ─────────────────────────────────

  chatEnabled: publicProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const settings = await getSettings(ctx.db, input.tenantId);
      return { enabled: !!(settings?.chatEnabled && settings?.apiKey) };
    }),

  // ── Public: chat ─────────────────────────────────────────────────────────────

  chat: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        message: z.string().min(1).max(1000),
        sessionToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await getSettings(ctx.db, input.tenantId);
      if (!settings?.apiKey) return { reply: "AI assistant is not configured for this store.", sessionToken: input.sessionToken ?? null };
      if (!settings.chatEnabled) return { reply: "AI chat is currently disabled.", sessionToken: input.sessionToken ?? null };

      // Get or create session
      const token = input.sessionToken ?? randomUUID();
      let session: any;

      const [existing] = await ctx.db
        .select()
        .from(aiChatSessions)
        .where(eq(aiChatSessions.sessionToken, token))
        .limit(1);

      if (existing) {
        session = existing;
      } else {
        const [created] = await ctx.db
          .insert(aiChatSessions)
          .values({ tenantId: input.tenantId, sessionToken: token })
          .returning();
        session = created;
      }

      // Fetch last 10 messages for context
      const history = await ctx.db
        .select({ role: aiChatMessages.role, content: aiChatMessages.content })
        .from(aiChatMessages)
        .where(eq(aiChatMessages.sessionId, session.id))
        .orderBy(desc(aiChatMessages.createdAt))
        .limit(10);
      history.reverse();

      // Save the user message
      await ctx.db.insert(aiChatMessages).values({
        sessionId: session.id,
        role: "user",
        content: input.message,
      });

      // Fetch store name
      const [tenant] = await ctx.db
        .select({ name: sql<string>`name` })
        .from(sql`tenants`)
        .where(sql`id = ${input.tenantId}`)
        .limit(1);
      const storeName = (tenant as any)?.name ?? "this store";

      const systemPrompt = await buildSystemPrompt(
        ctx.db,
        input.tenantId,
        storeName,
        settings.systemPromptExtra,
      );

      const provider: Provider = settings.provider ?? "anthropic";
      const model = settings.model || DEFAULT_MODELS[provider];

      let reply = "Sorry, I couldn't process that. Please try again.";
      try {
        reply = await callAI({
          provider,
          apiKey: settings.apiKey,
          model,
          system: systemPrompt,
          messages: [
            ...history.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
            { role: "user" as const, content: input.message },
          ],
          maxTokens: 500,
          customBaseUrl: settings.customBaseUrl,
        });
      } catch {
        // Keep fallback reply
      }

      await ctx.db.insert(aiChatMessages).values({
        sessionId: session.id,
        role: "assistant",
        content: reply,
      });

      return { reply, sessionToken: token };
    }),

  // ── Public: product recommendations ─────────────────────────────────────────

  recommendations: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        productId: z.string().uuid().optional(),
        limit: z.number().min(1).max(12).default(4),
      }),
    )
    .query(async ({ ctx, input }) => {
      const settings = await getSettings(ctx.db, input.tenantId);
      if (!settings?.recommendationsEnabled) return [];

      let candidateIds: string[] = [];

      if (input.productId) {
        const memberships = await ctx.db
          .select({ collectionId: collectionProducts.collectionId })
          .from(collectionProducts)
          .where(eq(collectionProducts.productId, input.productId));

        if (memberships.length > 0) {
          const collectionIds = memberships.map((m: any) => m.collectionId);
          const peers = await ctx.db
            .select({ productId: collectionProducts.productId })
            .from(collectionProducts)
            .where(inArray(collectionProducts.collectionId, collectionIds));
          candidateIds = peers
            .map((p: any) => p.productId)
            .filter((id: string) => id !== input.productId);
        }

        if (candidateIds.length < input.limit) {
          const [source] = await ctx.db
            .select({ tags: products.tags })
            .from(products)
            .where(eq(products.id, input.productId))
            .limit(1);

          if (source?.tags?.length) {
            const tagMatches = await ctx.db
              .select({ id: products.id })
              .from(products)
              .where(
                and(
                  eq(products.tenantId, input.tenantId),
                  eq(products.status, "active"),
                  sql`${products.tags} && ${JSON.stringify(source.tags)}::jsonb`,
                ),
              )
              .limit(20);
            const tagIds = tagMatches
              .map((p: any) => p.id)
              .filter((id: string) => id !== input.productId);
            candidateIds = [...new Set([...candidateIds, ...tagIds])];
          }
        }
      }

      const baseWhere = and(
        eq(products.tenantId, input.tenantId),
        eq(products.status, "active"),
        input.productId ? sql`${products.id} != ${input.productId}` : undefined,
      );

      let rows: any[];
      if (candidateIds.length > 0) {
        rows = await ctx.db
          .select({ id: products.id, title: products.title, handle: products.handle })
          .from(products)
          .where(and(baseWhere, inArray(products.id, candidateIds.slice(0, 40))))
          .limit(input.limit);
      } else {
        rows = await ctx.db
          .select({ id: products.id, title: products.title, handle: products.handle })
          .from(products)
          .where(baseWhere)
          .orderBy(desc(products.createdAt))
          .limit(input.limit);
      }

      const productIds = rows.map((r: any) => r.id);
      const prices =
        productIds.length > 0
          ? await ctx.db
              .select({ productId: variants.productId, price: variants.price })
              .from(variants)
              .where(inArray(variants.productId, productIds))
          : [];

      const priceMap = new Map<string, string>();
      for (const p of prices) {
        const cur = priceMap.get(p.productId);
        if (!cur || Number(p.price) < Number(cur)) priceMap.set(p.productId, p.price);
      }

      return rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        handle: r.handle,
        price: priceMap.get(r.id) ?? null,
      }));
    }),
});
