// Module: KStack_AIAssistant
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
  shippingRates,
} from "@kstack/db";
import { protectedProcedure, adminProcedure, publicProcedure, router } from "../trpc";

// ─── Provider config ──────────────────────────────────────────────────────────

type Provider = "anthropic" | "openai" | "gemini" | "bytez" | "custom";

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
  bytez: "meta-llama/Llama-3.2-1B-Instruct",
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

  if (provider === "bytez") {
    const headers = {
      "Authorization": `Key ${apiKey}`,
      "Content-Type": "application/json",
    };
    const baseUrl = `https://api.bytez.com/models/v2/${model}`;

    // Bytez requires models to be loaded before inference.
    // Try running; if the model isn't running yet, load it and retry once.
    const bytezRun = async (): Promise<Response> => {
      return fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [
            { role: "system", content: system },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          max_new_tokens: maxTokens,
        }),
      });
    };

    let res = await bytezRun();
    let rawText = await res.text();

    // Detect "model not running" and auto-load it, then retry
    const isNotRunning =
      !res.ok ||
      rawText.includes("Unable to fulfill request") ||
      rawText.includes("not running") ||
      rawText.includes("not loaded");

    if (isNotRunning) {
      console.log("[Bytez] Model not running — sending load request for", model);
      await fetch(`${baseUrl}/load`, { method: "POST", headers });
      // Give the model a few seconds to start
      await new Promise((r) => setTimeout(r, 5000));
      res = await bytezRun();
      rawText = await res.text();
    }

    if (!res.ok) {
      console.error("[Bytez HTTP error]", res.status, rawText.slice(0, 300));
      throw Object.assign(new Error(rawText || `Bytez error (${res.status})`), { status: res.status });
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      throw new Error(`Bytez returned non-JSON: ${rawText.slice(0, 200)}`);
    }

    // Surface API-level errors returned in the response body
    if (data["error"]) {
      throw new Error(String(data["error"]));
    }

    console.log("[Bytez raw response]", JSON.stringify(data).slice(0, 500));

    // Shape 1: OpenAI-compatible { choices: [{ message: { content } }] }
    const choices = data["choices"] as Array<{ message: { content: string } }> | undefined;
    if (choices?.[0]?.message?.content) return choices[0].message.content.trim();

    const output = data["output"];

    // Shape 2: plain string
    if (typeof output === "string") return output.trim();

    // Shape 2b: output is a single message object {role, content}
    if (output && !Array.isArray(output) && typeof output === "object") {
      const msg = output as { role?: string; content?: any; text?: any };
      const raw = msg.content ?? msg.text ?? "";
      if (typeof raw === "string" && raw.trim()) return raw.trim();
      if (Array.isArray(raw)) {
        const joined = raw.map((c: any) => c?.text ?? c?.content ?? "").join("").trim();
        if (joined) return joined;
      }
    }

    if (Array.isArray(output) && output.length > 0) {
      const first = output[0] as Record<string, unknown>;
      const generatedText = first["generated_text"];

      // Shape 3: generated_text is a plain string
      if (typeof generatedText === "string") return generatedText.trim();

      // Shape 4: generated_text is [{role, content|text}] — take last assistant message
      if (Array.isArray(generatedText)) {
        const msgs = generatedText as Array<{ role: string; text?: any; content?: any }>;
        const assistantMsg = [...msgs].reverse().find((m) => m.role === "assistant");
        if (assistantMsg) {
          const raw = assistantMsg.content ?? assistantMsg.text ?? "";
          if (typeof raw === "string") return raw.trim();
          // content can be an array of parts: [{type:"text",text:"..."}]
          if (Array.isArray(raw)) {
            const joined = raw.map((c: any) => c?.text ?? c?.content ?? "").join("").trim();
            if (joined) return joined;
          }
        }
      }

      // Shape 5: other top-level string fields
      const text = first["text"] ?? first["content"];
      if (typeof text === "string") return text.trim();
    }

    return "";
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
  try {
    await callAI({
      provider,
      apiKey,
      model,
      system: "You are a helpful assistant.",
      messages: [{ role: "user", content: "Say hi." }],
      maxTokens: 20,
      customBaseUrl: customBaseUrl ?? null,
    });
  } catch (err: any) {
    // Map raw HTTP status codes to human-readable messages
    const status: number | undefined = err?.status ?? err?.statusCode ?? err?.response?.status;
    const body = err?.message ?? "";

    if (body.includes("Unable to fulfill request")) {
      throw new Error("Model is not running yet — a load request has been sent. Wait 30–60 s then test again.");
    }
    if (status === 429 || body.includes("429")) {
      throw new Error("Rate limit hit — your API key is valid but quota is temporarily exhausted. Wait a moment and retry.");
    }
    if (status === 401 || body.includes("401") || body.toLowerCase().includes("unauthorized") || body.toLowerCase().includes("invalid api key")) {
      throw new Error("Invalid API key — double-check the key and make sure it has access to the selected model.");
    }
    if (status === 403 || body.includes("403")) {
      throw new Error("Access denied (403) — the API key may not have the required permissions or the model is not enabled for this project.");
    }
    if (status === 404 || body.includes("404")) {
      throw new Error(`Model not found — "${model}" may not exist or is not accessible with this key.`);
    }
    throw err;
  }
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
  compact = false,
) {
  // Determine the store's currency from a recent order (default ZAR)
  const [currencyRow] = await db
    .select({ currency: sql<string>`currency` })
    .from(sql`orders`)
    .where(sql`tenant_id = ${tenantId}`)
    .orderBy(sql`created_at desc`)
    .limit(1);
  const currency = (currencyRow as any)?.currency ?? "ZAR";

  // Fetch ALL active products with min price and aggregated variant options
  const productRows = await db.execute(sql`
    SELECT
      p.id,
      p.title,
      p.description,
      p.handle,
      p.tags,
      (SELECT MIN(v.price) FROM variants v WHERE v.product_id = p.id) AS price
    FROM products p
    WHERE p.tenant_id = ${tenantId} AND p.status = 'active'
    ORDER BY p.title ASC
    ${compact ? sql`LIMIT 30` : sql``}
  `);

  const productList: any[] = productRows.rows ?? (productRows as any);

  // Fetch all variants (with options) for these products
  const productIds = productList.map((p: any) => p.id);
  let variantOptionsByProduct: Record<string, Record<string, Set<string>> | undefined> = {};
  if (productIds.length > 0) {
    const variantRows = await db.execute(sql`
      SELECT product_id, options
      FROM variants
      WHERE product_id = ANY(ARRAY[${sql.raw(productIds.map((id: string) => `'${id}'`).join(","))}]::uuid[])
        AND options IS NOT NULL AND options != '{}'::jsonb
    `);
    const vRows: any[] = variantRows.rows ?? (variantRows as any);
    for (const v of vRows) {
      if (!v.options) continue;
      const opts: Record<string, string> = typeof v.options === "string" ? JSON.parse(v.options) : v.options;
      if (!variantOptionsByProduct[v.product_id]) variantOptionsByProduct[v.product_id] = {};
      const productOpts = variantOptionsByProduct[v.product_id]!;
      for (const [k, val] of Object.entries(opts)) {
        if (!productOpts[k]) productOpts[k] = new Set();
        productOpts[k].add(String(val));
      }
    }
  }

  const productContext = productList
    .map((p: any) => {
      const priceStr = p.price ? ` (${currency} ${Number(p.price).toFixed(2)})` : "";
      const optMap: Record<string, Set<string>> = variantOptionsByProduct[p.id] ?? {};
      const optStr = Object.entries(optMap)
        .map(([k, vals]) => `${k}: ${[...(vals as Set<string>)].join(", ")}`)
        .join(" | ");
      const rawTags = typeof p.tags === "string" ? JSON.parse(p.tags) : (p.tags ?? []);

      if (compact) {
        return `• ${p.title}${priceStr}${optStr ? ` [${optStr}]` : ""}`;
      }

      const parts: string[] = [`• ${p.title}${priceStr} — /products/${p.handle}`];
      if (p.description) parts.push(`  Description: ${p.description.slice(0, 150)}`);
      if (optStr) parts.push(`  Options: ${optStr}`);
      if (rawTags.length) parts.push(`  Tags: ${rawTags.join(", ")}`);
      return parts.join("\n");
    })
    .join("\n");

  // Fetch active shipping rates
  const shippingRows = await db
    .select({
      name: shippingRates.name,
      type: shippingRates.type,
      price: shippingRates.price,
      minOrderAmount: shippingRates.minOrderAmount,
      estimatedDays: shippingRates.estimatedDays,
    })
    .from(shippingRates)
    .where(and(eq(shippingRates.tenantId, tenantId), eq(shippingRates.isActive, true)))
    .orderBy(asc(shippingRates.sortOrder));

  const shippingContext = shippingRows.length
    ? shippingRows
        .map((s: any) => {
          if (s.type === "free") return `• ${s.name}: Free shipping${s.estimatedDays ? ` (${s.estimatedDays})` : ""}`;
          if (s.type === "free_over") return `• ${s.name}: Free on orders over ${currency} ${Number(s.minOrderAmount).toFixed(2)}${s.estimatedDays ? ` (${s.estimatedDays})` : ""}`;
          return `• ${s.name}: ${currency} ${Number(s.price).toFixed(2)}${s.estimatedDays ? ` (${s.estimatedDays})` : ""}`;
        })
        .join("\n")
    : "No shipping rates configured.";

  if (compact) {
    return [
      `You are a helpful shopping assistant for ${storeName}. Store currency: ${currency}.`,
      `Products: ${productContext || "none yet"}.`,
      `Shipping: ${shippingContext.replace(/\n/g, "; ")}.`,
      "Use clean bullet lists for products: • Name — ZAR X.XX | Sizes: ... | Colors: ... Never add notes or disclaimers. Never list the same product twice. Never invent prices or policies.",
      extra ?? "",
    ].filter(Boolean).join(" ");
  }

  return [
    `You are a helpful, friendly customer support assistant for ${storeName}.`,
    `Store currency: ${currency}. Always quote prices in ${currency} — never use USD or any other currency.`,
    "",
    "Your role:",
    "- Help customers find products that match their needs",
    "- Answer questions about products, pricing, and the shopping experience",
    "- Guide customers toward making a purchase",
    "- Be concise, warm, and professional",
    "- When listing products use a clean bullet list, one product per line: '• Name — ZAR X.XX | Sizes: S, M, L | Colors: Black'",
    "- Never add notes, disclaimers, or extra commentary after the list",
    "- Never list the same product twice — if duplicates appear in the catalog, treat them as one",
    "",
    `Active product catalog (${productList.length} products):`,
    productContext || "No products listed yet.",
    "",
    "Shipping options:",
    shippingContext,
    "",
    "Guidelines:",
    "- Reference exact product names when recommending",
    "- Include the product path (e.g. /products/handle) when mentioning a specific product",
    "- Only quote prices and shipping rates from the data above — never invent or assume values",
    "- When a customer wants to buy or add a product to their cart, share the product page link (e.g. /products/handle) and encourage them to add it there — you cannot add to cart directly",
    "- If asked about something not listed (policies, stock, etc.), say you're not sure and suggest they contact the store",
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
          provider: z.enum(["anthropic", "openai", "gemini", "bytez", "custom"]).optional(),
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
      if (!settings?.apiKey) return { ok: false, error: "No API key configured — enter and save your key first." };
      try {
        const provider: Provider = settings.provider ?? "anthropic";
        const model = settings.model || DEFAULT_MODELS[provider];
        await testProvider(provider, settings.apiKey, model, settings.customBaseUrl);
        return { ok: true };
      } catch (err: any) {
        const msg: string = err?.message ?? "Connection failed";
        // 429 from Gemini still counts as "key is valid" — surface as a warning not a failure
        const isRateLimit = msg.includes("Rate limit") || msg.includes("429");
        return { ok: isRateLimit, error: isRateLimit ? undefined : msg, warning: isRateLimit ? msg : undefined };
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

      const provider: Provider = settings.provider ?? "anthropic";
      const model = settings.model || DEFAULT_MODELS[provider];

      // Bytez small models have tight context windows — use a compact prompt
      const compactPrompt = provider === "bytez";
      const systemPrompt = await buildSystemPrompt(
        ctx.db,
        input.tenantId,
        storeName,
        settings.systemPromptExtra,
        compactPrompt,
      );

      // Filter out empty-content messages from history — small models and Bytez
      // reject empty strings, and an empty assistant reply should never be re-sent.
      const cleanHistory = history
        .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content as string }))
        .filter((m) => m.content.trim().length > 0);

      let reply = "Sorry, I couldn't process that. Please try again.";
      try {
        reply = await callAI({
          provider,
          apiKey: settings.apiKey,
          model,
          system: systemPrompt,
          messages: [
            ...cleanHistory,
            { role: "user" as const, content: input.message },
          ],
          maxTokens: 500,
          customBaseUrl: settings.customBaseUrl,
        });
      } catch (err: any) {
        console.error("[AI chat error]", provider, model, err?.status, err?.message, err?.response?.data ?? "");
        // Surface Bytez-specific errors to the user instead of a generic fallback
        if (provider === "bytez") {
          const status = err?.status ?? err?.statusCode;
          if (status === 503 || err?.message?.includes("503")) {
            reply = "The AI model is warming up — please send your message again in a few seconds.";
          } else if (status === 404 || err?.message?.includes("404")) {
            reply = `Model "${model}" was not found on Bytez. Check the model name in AI settings.`;
          } else if (err?.message) {
            reply = `AI error: ${err.message}`;
          }
        }
      }

      // Never save or return an empty reply — use the fallback message instead
      if (!reply.trim()) {
        reply = "Sorry, I couldn't process that. Please try again.";
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
