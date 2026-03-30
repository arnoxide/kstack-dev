/**
 * KStack anonymous usage telemetry.
 *
 * What is collected:
 *   - A random install ID (UUID generated once, stored in your local database)
 *   - KStack version
 *   - Number of tenants on this instance
 *   - Node environment (development / production)
 *
 * What is NOT collected:
 *   - Any merchant or customer data
 *   - Product, order, or financial information
 *   - IP address or personally identifiable information
 *   - License keys
 *
 * How to opt out:
 *   Set KSTACK_TELEMETRY=false in your environment variables.
 *
 * Why we collect this:
 *   It helps us understand how KStack is being used so we can prioritise
 *   features, fix bugs faster, and keep the framework healthy.
 */

import { db } from "@kstack/db";
import { frameworkConfig, tenants } from "@kstack/db";
import { eq, count } from "drizzle-orm";
import { randomUUID } from "crypto";

const TELEMETRY_URL =
  process.env["KSTACK_TELEMETRY_URL"] ?? "https://telemetry.kstack.dev/ping";

const NOTICE = `
┌─────────────────────────────────────────────────────────────┐
│                  KStack Telemetry Notice                    │
│                                                             │
│  KStack collects anonymous usage data to help improve the   │
│  framework. No personal or store data is ever collected.    │
│                                                             │
│  What's sent: install ID, version, tenant count, node env   │
│  To opt out:  set  KSTACK_TELEMETRY=false  in your .env     │
│  Learn more:  https://kstack.dev/docs/telemetry             │
└─────────────────────────────────────────────────────────────┘
`.trim();

async function getOrCreateInstallId(): Promise<string> {
  const [row] = await db
    .select()
    .from(frameworkConfig)
    .where(eq(frameworkConfig.key, "install_id"))
    .limit(1);

  if (row) return row.value;

  const id = randomUUID();
  await db
    .insert(frameworkConfig)
    .values({ key: "install_id", value: id })
    .onConflictDoNothing();
  return id;
}

async function hasShownNotice(): Promise<boolean> {
  const [row] = await db
    .select()
    .from(frameworkConfig)
    .where(eq(frameworkConfig.key, "telemetry_notice_shown"))
    .limit(1);
  return row?.value === "true";
}

async function markNoticeShown(): Promise<void> {
  await db
    .insert(frameworkConfig)
    .values({ key: "telemetry_notice_shown", value: "true" })
    .onConflictDoUpdate({
      target: frameworkConfig.key,
      set: { value: "true", updatedAt: new Date() },
    });
}

const version: string = (() => {
  try {
    return (require("../../../../package.json") as { version?: string }).version ?? "unknown";
  } catch {
    return "unknown";
  }
})();

export async function runTelemetry(): Promise<void> {
  // Respect opt-out
  if (process.env["KSTACK_TELEMETRY"] === "false") return;

  try {
    // Print the notice once — on the very first boot
    const noticed = await hasShownNotice();
    if (!noticed) {
      console.log("\n" + NOTICE + "\n");
      await markNoticeShown();
    }

    const [installId, [countRow]] = await Promise.all([
      getOrCreateInstallId(),
      db.select({ c: count() }).from(tenants),
    ]);

    await fetch(TELEMETRY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installId,
        version,
        tenantCount: countRow?.c ?? 0,
        nodeEnv: process.env["NODE_ENV"] ?? "unknown",
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Silent — telemetry must never affect the running server
  }
}
