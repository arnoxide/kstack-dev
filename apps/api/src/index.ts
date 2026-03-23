import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createContext } from "./context";
import { appRouter } from "./router";

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
