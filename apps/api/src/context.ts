import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { verifyAccessToken } from "@kstack/auth";
import { db } from "@kstack/db";
import type { JwtPayload } from "@kstack/types";

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

  let user: JwtPayload | null = null;
  const authHeader = opts.req.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    try {
      user = await verifyAccessToken(authHeader.slice(7));
    } catch {
      // invalid token
    }
  }

  return {
    db,
    user,
    tenantId: user?.tenantId ?? null,
    ip,
  };
}
