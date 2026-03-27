import { db } from "@kstack/db";
import { frameworkConfig, tenants } from "@kstack/db";
import { eq, count } from "drizzle-orm";
import { randomUUID } from "crypto";

const TELEMETRY_ENDPOINT =
  process.env["KSTACK_TELEMETRY_URL"] ?? "https://telemetry.zansify.com/telemetry";

async function getInstallId(): Promise<string> {
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const version: string = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("../../../../package.json") as { version?: string }).version ?? "unknown";
  } catch {
    return "unknown";
  }
})();

export async function sendTelemetry(): Promise<void> {
  if (process.env["KSTACK_TELEMETRY"] === "false") return;

  try {
    const [installId, [countRow]] = await Promise.all([
      getInstallId(),
      db.select({ c: count() }).from(tenants),
    ]);

    await fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installId,
        version,
        licenseKey: process.env["KSTACK_LICENSE_KEY"] ?? null,
        tenantCount: countRow?.c ?? 0,
        nodeEnv: process.env["NODE_ENV"] ?? "unknown",
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Silent — never break the app
  }
}
