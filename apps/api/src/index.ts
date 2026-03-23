import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createContext } from "./context";
import { appRouter } from "./router";
import { verifyPaystackWebhook } from "./lib/paystack";
import { db, integrations, orders } from "@kasify/db";
import { and, eq } from "drizzle-orm";

const app = new Hono();

// Middleware
app.use("*", logger());
const isProd = process.env["NODE_ENV"] === "production";
const allowedOrigins = [
  ...(isProd ? [] : ["http://localhost:3002", "http://localhost:3003", "http://localhost:3004"]),
  ...(process.env["ALLOWED_ORIGINS"]?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
];

app.use(
  "*",
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Paystack webhook — outside CORS, raw body
app.post("/webhook/paystack", async (c) => {
  const signature = c.req.header("x-paystack-signature") ?? "";
  const payload = await c.req.text();

  let event: { event: string; data: { reference: string; status: string } };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (event.event === "charge.success" && event.data.status === "success") {
    // Find order by reference to get tenantId, then look up their webhook secret
    const [order] = await db
      .select({ id: orders.id, tenantId: orders.tenantId })
      .from(orders)
      .where(eq(orders.paystackReference, event.data.reference))
      .limit(1);

    if (order) {
      // Verify signature with tenant's webhook secret
      const [integration] = await db
        .select({ config: integrations.config })
        .from(integrations)
        .where(and(eq(integrations.tenantId, order.tenantId), eq(integrations.provider, "paystack" as "stripe")))
        .limit(1);

      const webhookSecret = (integration?.config as Record<string, string> | undefined)?.["webhookSecret"] ?? "";
      if (webhookSecret) {
        const valid = await verifyPaystackWebhook(payload, signature, webhookSecret);
        if (!valid) return c.json({ error: "Invalid signature" }, 401);
      }

      await db
        .update(orders)
        .set({ financialStatus: "paid", updatedAt: new Date() })
        .where(eq(orders.id, order.id));
    }
  }

  return c.json({ received: true });
});

// tRPC handler
app.all("/trpc/*", (c) => {
  return fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      if (process.env["NODE_ENV"] === "development") {
        console.error(`tRPC error on ${path}:`, error);
      }
    },
  });
});

const PORT = Number(process.env["API_PORT"] ?? 3001);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`API server running on http://localhost:${info.port}`);
});

export type { AppRouter } from "./router";
