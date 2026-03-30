/**
 * KStack license validation.
 *
 * KStack is free and open source (MIT) for the Community plan.
 * A license key unlocks Pro and Enterprise features.
 *
 * Get a license: https://kstack.dev/pricing
 * Set your key:  KSTACK_LICENSE_KEY=your-key  in your .env
 *
 * Validation is done once at startup and cached for 24 hours.
 * Your instance keeps running even if validation fails — the key
 * simply falls back to the community plan.
 */

import { db } from "@kstack/db";
import { frameworkConfig } from "@kstack/db";
import { eq } from "drizzle-orm";

export type LicensePlan = "community" | "pro" | "enterprise";

const LICENSE_API_URL =
  process.env["KSTACK_LICENSE_API_URL"] ?? "https://api.kstack.dev/license/validate";

// In-memory cache — avoids repeated DB reads within the same process lifetime
let cachedPlan: LicensePlan | null = null;

interface LicenseCache {
  plan: LicensePlan;
  validatedAt: string; // ISO timestamp
}

async function readCachedLicense(): Promise<LicenseCache | null> {
  try {
    const [row] = await db
      .select()
      .from(frameworkConfig)
      .where(eq(frameworkConfig.key, "license_cache"))
      .limit(1);

    if (!row) return null;
    return JSON.parse(row.value) as LicenseCache;
  } catch {
    return null;
  }
}

async function writeCachedLicense(plan: LicensePlan): Promise<void> {
  const value = JSON.stringify({ plan, validatedAt: new Date().toISOString() } satisfies LicenseCache);
  await db
    .insert(frameworkConfig)
    .values({ key: "license_cache", value })
    .onConflictDoUpdate({
      target: frameworkConfig.key,
      set: { value, updatedAt: new Date() },
    });
}

function isCacheStale(cache: LicenseCache): boolean {
  const validatedAt = new Date(cache.validatedAt).getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return Date.now() - validatedAt > twentyFourHours;
}

async function validateWithServer(key: string): Promise<LicensePlan> {
  const res = await fetch(LICENSE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return "community";

  const body = await res.json() as { plan?: LicensePlan; valid?: boolean };
  if (!body.valid) return "community";
  return body.plan ?? "community";
}

export async function resolveLicensePlan(): Promise<LicensePlan> {
  // Return in-memory cache if available
  if (cachedPlan) return cachedPlan;

  const key = process.env["KSTACK_LICENSE_KEY"];

  // No key set → community plan
  if (!key) {
    cachedPlan = "community";
    return "community";
  }

  try {
    // Check DB cache first
    const cached = await readCachedLicense();
    if (cached && !isCacheStale(cached)) {
      cachedPlan = cached.plan;
      return cached.plan;
    }

    // Cache is missing or stale — validate with server
    const plan = await validateWithServer(key);
    await writeCachedLicense(plan);
    cachedPlan = plan;
    return plan;
  } catch {
    // Validation failed (network error, timeout, etc.)
    // Fall back to cached plan if available, otherwise community
    const cached = await readCachedLicense();
    const fallback: LicensePlan = cached?.plan ?? "community";
    cachedPlan = fallback;
    return fallback;
  }
}

/** True if the current license is Pro or Enterprise */
export function isPro(): boolean {
  return cachedPlan === "pro" || cachedPlan === "enterprise";
}

/** True if the current license is Enterprise */
export function isEnterprise(): boolean {
  return cachedPlan === "enterprise";
}

export function getCurrentPlan(): LicensePlan {
  return cachedPlan ?? "community";
}

/** Call once at startup — logs license status to console */
export async function initLicense(): Promise<void> {
  const plan = await resolveLicensePlan();
  const key = process.env["KSTACK_LICENSE_KEY"];

  if (!key) {
    console.log("  License   community (no key set — get one at https://kstack.dev/pricing)");
  } else if (plan === "community") {
    console.log("  License   community (key provided but could not be validated)");
  } else {
    console.log(`  License   ${plan.toUpperCase()} ✓`);
  }
}
