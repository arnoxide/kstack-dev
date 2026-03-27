import type { Context, Next } from "hono";
import { verifyAccessToken } from "./jwt";
import type { JwtPayload } from "@kstack/types";

declare module "hono" {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

/**
 * Hono middleware: requires a valid Bearer JWT in the Authorization header.
 * Sets ctx.var.user on success, returns 401 on failure.
 */
export async function requireAuth(ctx: Context, next: Next): Promise<Response | void> {
  const authHeader = ctx.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return ctx.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyAccessToken(token);
    ctx.set("user", payload);
    await next();
  } catch {
    return ctx.json({ error: "Invalid or expired token" }, 401);
  }
}

/**
 * Hono middleware: requires the user to be an owner or admin of their tenant.
 * Must be used after requireAuth.
 */
export async function requireAdminRole(ctx: Context, next: Next): Promise<Response | void> {
  const user = ctx.get("user");
  if (!user || (user.role !== "owner" && user.role !== "admin")) {
    return ctx.json({ error: "Forbidden" }, 403);
  }
  await next();
}
