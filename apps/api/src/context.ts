import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { verifyAccessToken } from "@kasify/auth";
import { db } from "@kasify/db";
import type { JwtPayload } from "@kasify/types";

export interface Context {
  db: typeof db;
  user: JwtPayload | null;
  tenantId: string | null;
  ip: string;
}

export async function createContext(opts: FetchCreateContextFnOptions): Promise<Context> {
  const ip =
    opts.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    opts.req.headers.get("x-real-ip") ??
    "unknown";

  const authHeader = opts.req.headers.get("Authorization");
  let user: JwtPayload | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      user = await verifyAccessToken(token);
    } catch {
      // token invalid — user stays null
    }
  }

  return {
    db,
    user,
    tenantId: user?.tenantId ?? null,
    ip,
  };
}
