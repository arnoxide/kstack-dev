import { TRPCError } from "@trpc/server";

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Purge expired windows every 10 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store) {
    if (win.resetAt < now) store.delete(key);
  }
}, 10 * 60 * 1000).unref();

/**
 * Throws TRPCError("TOO_MANY_REQUESTS") if the caller exceeds the limit.
 *
 * @param ip      Client IP address
 * @param key     Unique identifier for this limit (e.g. "auth.login")
 * @param limit   Max requests allowed within the window
 * @param windowMs  Window size in milliseconds
 */
export function checkRateLimit(ip: string, key: string, limit: number, windowMs: number): void {
  const storeKey = `${ip}:${key}`;
  const now = Date.now();
  const entry = store.get(storeKey);

  if (!entry || entry.resetAt < now) {
    store.set(storeKey, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.count >= limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later.",
    });
  }

  entry.count++;
}

// Pre-configured limiters for common use cases
const isDev = process.env["NODE_ENV"] !== "production";

export const LIMITS = {
  /** 10 attempts per 15 minutes in prod; relaxed in dev */
  auth: (ip: string, key: string) =>
    isDev ? undefined : checkRateLimit(ip, key, 10, 15 * 60 * 1000),
  /** 5 registrations per hour in prod; relaxed in dev */
  register: (ip: string, key: string) =>
    isDev ? undefined : checkRateLimit(ip, key, 5, 60 * 60 * 1000),
  /** 20 lookups per 15 minutes — public order lookup */
  lookup: (ip: string, key: string) => checkRateLimit(ip, key, 20, 15 * 60 * 1000),
};
