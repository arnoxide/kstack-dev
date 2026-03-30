#!/usr/bin/env tsx
/**
 * KStack CLI
 * Usage: pnpm kstack <command> [options]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import * as readline from "node:readline/promises";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toCamel(s: string) {
  return s[0].toLowerCase() + s.slice(1);
}

function toKebab(s: string) {
  return s.replace(/([A-Z])/g, (m, l, offset) => (offset > 0 ? "-" : "") + l.toLowerCase());
}

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf-8");
}

function write(rel: string, content: string, dryRun: boolean) {
  const abs = join(ROOT, rel);
  if (dryRun) {
    console.log(`  [dry-run] write -> ${rel}`);
    return;
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf-8");
  console.log(`  created  ${rel}`);
}

function patch(rel: string, transform: (src: string) => string, dryRun: boolean) {
  const original = read(rel);
  const updated = transform(original);
  if (updated === original) {
    console.log(`  skipped  ${rel} (already up to date)`);
    return;
  }
  if (dryRun) {
    console.log(`  [dry-run] patch -> ${rel}`);
    return;
  }
  writeFileSync(join(ROOT, rel), updated, "utf-8");
  console.log(`  patched  ${rel}`);
}

// ─── Usage ───────────────────────────────────────────────────────────────────

function usage() {
  console.log([
    "",
    "KStack CLI",
    "",
    "Commands:",
    "  store:create                        Create a new store (owner account + tenant)",
    "  module:create <Vendor_ModuleName>   Scaffold a new module",
    "  module:list                         List all registered modules",
    "  info                                Show framework info and license status",
    "",
    "Options (module:create):",
    "  --description <text>   Module description  (default: '<ModuleName> module')",
    "  --no-api               Skip API router generation",
    "  --no-dashboard         Skip dashboard page generation",
    "  --no-schema            Skip DB schema file generation",
    "  --no-sidebar           Skip sidebar nav item",
    "  --dry-run              Preview changes without writing files",
    "",
    "Examples:",
    "  pnpm kstack store:create",
    "  pnpm kstack module:create KStack_Loyalty",
    "  pnpm kstack module:create KStack_Blog --description 'Blog posts and articles'",
    "  pnpm kstack module:create KStack_Referrals --dry-run",
    "  pnpm kstack module:list",
    "  pnpm kstack info",
    "",
  ].join("\n"));
}

// ─── store:create ─────────────────────────────────────────────────────────────

async function cmdStoreCreate() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = async (prompt: string, hidden = false): Promise<string> => {
    if (hidden) {
      process.stdout.write(prompt);
      return new Promise((resolve) => {
        const stdin = process.stdin;
        stdin.setRawMode?.(true);
        stdin.resume();
        stdin.setEncoding("utf-8");
        let input = "";
        stdin.on("data", function onData(ch: string) {
          if (ch === "\r" || ch === "\n") {
            stdin.setRawMode?.(false);
            stdin.pause();
            stdin.removeListener("data", onData);
            process.stdout.write("\n");
            resolve(input);
          } else if (ch === "\u0003") {
            process.exit(1);
          } else if (ch === "\u007f") {
            if (input.length > 0) {
              input = input.slice(0, -1);
              process.stdout.write("\b \b");
            }
          } else {
            input += ch;
            process.stdout.write("*");
          }
        });
      });
    }
    const answer = await rl.question(prompt);
    return answer.trim();
  };

  console.log("\n  KStack — Create a new store\n");

  const name     = await ask("  Owner name    : ");
  const email    = await ask("  Owner email   : ");
  const password = await ask("  Password      : ", true);
  const confirm  = await ask("  Confirm       : ", true);

  if (password !== confirm) {
    console.error("\n  Error: Passwords do not match.\n");
    rl.close();
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("\n  Error: Password must be at least 8 characters.\n");
    rl.close();
    process.exit(1);
  }

  const shopName = await ask("  Shop name     : ");
  const suggested = shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const shopSlug  = (await ask(`  Shop URL slug [${suggested}]: `)) || suggested;

  rl.close();

  if (!name || !email || !shopName || !shopSlug) {
    console.error("\n  Error: All fields are required.\n");
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("\n  Error: Invalid email address.\n");
    process.exit(1);
  }
  if (!/^[a-z0-9-]+$/.test(shopSlug)) {
    console.error("\n  Error: Slug may only contain lowercase letters, numbers, and hyphens.\n");
    process.exit(1);
  }

  console.log("\n  Creating store...");

  // Dynamically import DB and auth — avoids loading them for other CLI commands
  const [{ db }, schema, { eq }, bcrypt] = await Promise.all([
    import("@kstack/db/client"),
    import("@kstack/db/schema"),
    import("drizzle-orm"),
    import("bcryptjs"),
  ] as const);

  const { users, merchantUsers, tenants } = schema;

  // Check for conflicts
  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    console.error("\n  Error: An account with that email already exists.\n");
    process.exit(1);
  }

  const [existingTenant] = await db.select().from(tenants).where(eq(tenants.slug, shopSlug)).limit(1);
  if (existingTenant) {
    console.error(`\n  Error: The slug "${shopSlug}" is already taken. Choose a different one.\n`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({ email, name, passwordHash })
      .returning();

    if (!newUser) throw new Error("Failed to create user");

    const [newTenant] = await tx
      .insert(tenants)
      .values({ slug: shopSlug, name: shopName, email })
      .returning();

    if (!newTenant) throw new Error("Failed to create tenant");

    await tx.insert(merchantUsers).values({
      userId: newUser.id,
      tenantId: newTenant.id,
      role: "owner",
    });

    return { user: newUser, tenant: newTenant };
  });

  const rootDomain = process.env["ROOT_DOMAIN"] ?? "localhost:3000";
  const dashUrl    = `http://${result.tenant.slug}.${rootDomain}`;

  console.log([
    "",
    "  Store created successfully!",
    "",
    `  Shop name : ${result.tenant.name}`,
    `  Shop slug : ${result.tenant.slug}`,
    `  Email     : ${result.user.email}`,
    `  Dashboard : ${dashUrl}`,
    "",
    "  Log in with the email and password you just set.",
    "",
  ].join("\n"));
}

// ─── module:list ─────────────────────────────────────────────────────────────

function cmdModuleList() {
  const modulesJson = JSON.parse(read("modules.json")) as {
    vendor: string;
    modules: Array<{ name: string; description: string; status: string; version: string }>;
  };

  const modules = modulesJson.modules;
  if (!modules.length) {
    console.log("\nNo modules registered.\n");
    return;
  }

  const active   = modules.filter((m) => m.status === "active");
  const disabled = modules.filter((m) => m.status !== "active");

  console.log(`\nKStack Modules  (${modules.length} total)\n`);
  console.log(
    "  " + ["Name".padEnd(32), "Version".padEnd(10), "Status".padEnd(10), "Description"].join("  "),
  );
  console.log("  " + "-".repeat(90));

  for (const m of [...active, ...disabled]) {
    const statusLabel = m.status === "active" ? "active" : m.status;
    console.log(
      "  " + [
        m.name.padEnd(32),
        (m.version ?? "—").padEnd(10),
        statusLabel.padEnd(10),
        m.description,
      ].join("  "),
    );
  }
  console.log();
}

// ─── info ─────────────────────────────────────────────────────────────────────

function cmdInfo() {
  const pkg = JSON.parse(read("package.json")) as { version?: string; name?: string };
  const modulesJson = JSON.parse(read("modules.json")) as {
    modules: Array<{ status: string }>;
  };

  const version = pkg.version ?? "unknown";
  const moduleCount = modulesJson.modules.length;
  const activeCount = modulesJson.modules.filter((m) => m.status === "active").length;
  const licenseKey  = process.env["KSTACK_LICENSE_KEY"] ?? "(none)";
  const plan        = licenseKey !== "(none)" ? "Pro/Enterprise (unvalidated — start API to verify)" : "Community (free)";

  console.log([
    "",
    "KStack Framework",
    "",
    `  Version     : ${version}`,
    `  Modules     : ${activeCount} active / ${moduleCount} total`,
    `  License key : ${licenseKey === "(none)" ? licenseKey : licenseKey.slice(0, 8) + "…"}`,
    `  Plan        : ${plan}`,
    `  Docs        : https://kstack.dev/docs`,
    `  Pricing     : https://kstack.dev/pricing`,
    "",
  ].join("\n"));
}

// ─── Argument parsing ────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);

if (!rawArgs.length || rawArgs[0] === "--help" || rawArgs[0] === "-h") {
  usage();
  process.exit(0);
}

// ─── Command dispatch ────────────────────────────────────────────────────────

if (rawArgs[0] === "store:create") {
  await cmdStoreCreate();
  process.exit(0);
}

if (rawArgs[0] === "module:list") {
  cmdModuleList();
  process.exit(0);
}

if (rawArgs[0] === "info") {
  cmdInfo();
  process.exit(0);
}

// Accept both:  module:create KStack_X   OR just  KStack_X
let moduleArg: string;
const argsCopy = [...rawArgs];

if (argsCopy[0] === "module:create") {
  argsCopy.shift();
  moduleArg = argsCopy.shift()!;
} else {
  moduleArg = argsCopy.shift()!;
}

if (!moduleArg) {
  console.error("Error: module name is required.\n");
  usage();
  process.exit(1);
}

if (!/^[A-Z][a-zA-Z0-9]*_[A-Z][a-zA-Z0-9]*$/.test(moduleArg)) {
  console.error(`Error: "${moduleArg}" is not valid. Use Vendor_ModuleName format (e.g., KStack_Loyalty).\n`);
  process.exit(1);
}

const [vendor, moduleName] = moduleArg.split("_");
const camelName = toCamel(moduleName);  // e.g. loyalty
const kebabName = toKebab(moduleName);  // e.g. loyalty  |  myModule -> my-module
const routerVar = `${camelName}Router`; // loyaltyRouter
const routerKey = camelName;           // loyalty (key in appRouter)
const tableVar  = `${camelName}Items`; // loyaltyItems (suggested table name)
const tableName = `${kebabName}_items`; // loyalty_items

// Parse flags
let description = `${moduleName} module`;
let genApi       = true;
let genDashboard = true;
let genSchema    = true;
let genSidebar   = true;
let dryRun       = false;

for (let i = 0; i < argsCopy.length; i++) {
  switch (argsCopy[i]) {
    case "--description":
      description = argsCopy[++i] ?? description;
      break;
    case "--no-api":       genApi       = false; break;
    case "--no-dashboard": genDashboard = false; break;
    case "--no-schema":    genSchema    = false; break;
    case "--no-sidebar":   genSidebar   = false; break;
    case "--dry-run":      dryRun       = true;  break;
    default:
      console.warn(`Unknown flag: ${argsCopy[i]}`);
  }
}

// ─── Conflict check ──────────────────────────────────────────────────────────

const modulesJson = JSON.parse(read("modules.json")) as {
  vendor: string;
  modules: Array<{ name: string; description: string; status: string; version: string; files: Record<string, unknown> }>;
};

const existing = modulesJson.modules.find((m) => m.name === moduleArg);
if (existing) {
  console.error(`\nModule "${moduleArg}" is already registered in modules.json.`);
  console.error("Edit the existing files rather than scaffolding a new module.\n");
  process.exit(1);
}

// ─── Print plan ──────────────────────────────────────────────────────────────

console.log(`\nScaffolding module: ${moduleArg}`);
console.log(`  vendor     : ${vendor}`);
console.log(`  moduleName : ${moduleName}`);
console.log(`  camelCase  : ${camelName}`);
console.log(`  kebab-case : ${kebabName}`);
console.log(`  router key : ${routerKey}`);
if (dryRun) console.log("  mode       : DRY RUN - no files will be written");
console.log();

// ─── File templates ──────────────────────────────────────────────────────────

function apiRouterTemplate(): string {
  const lines = [
    `// Module: ${moduleArg}`,
    `import { TRPCError } from "@trpc/server";`,
    `import { and, eq, asc } from "drizzle-orm";`,
    `import { z } from "zod";`,
    `// import { ${tableVar} } from "@kstack/db";  // uncomment once schema is added`,
    `import { protectedProcedure, adminProcedure, router } from "../trpc";`,
    ``,
    `export const ${routerVar} = router({`,
    `  list: protectedProcedure.query(async ({ ctx }) => {`,
    `    // TODO: query ${tableVar} where tenantId = ctx.tenantId`,
    `    return [];`,
    `  }),`,
    ``,
    `  get: protectedProcedure`,
    `    .input(z.object({ id: z.string().uuid() }))`,
    `    .query(async ({ ctx, input }) => {`,
    `      // TODO: fetch single record`,
    `      throw new TRPCError({ code: "NOT_FOUND" });`,
    `    }),`,
    ``,
    `  create: adminProcedure`,
    `    .input(`,
    `      z.object({`,
    `        name: z.string().min(1),`,
    `        // TODO: add more fields`,
    `      }),`,
    `    )`,
    `    .mutation(async ({ ctx, input }) => {`,
    `      // TODO: insert into ${tableVar}`,
    `      throw new TRPCError({ code: "METHOD_NOT_SUPPORTED", message: "Not implemented" });`,
    `    }),`,
    ``,
    `  update: adminProcedure`,
    `    .input(`,
    `      z.object({`,
    `        id: z.string().uuid(),`,
    `        name: z.string().min(1).optional(),`,
    `        // TODO: add more fields`,
    `      }),`,
    `    )`,
    `    .mutation(async ({ ctx, input }) => {`,
    `      // TODO: update ${tableVar}`,
    `      throw new TRPCError({ code: "METHOD_NOT_SUPPORTED", message: "Not implemented" });`,
    `    }),`,
    ``,
    `  delete: adminProcedure`,
    `    .input(z.object({ id: z.string().uuid() }))`,
    `    .mutation(async ({ ctx, input }) => {`,
    `      // TODO: delete from ${tableVar}`,
    `      throw new TRPCError({ code: "METHOD_NOT_SUPPORTED", message: "Not implemented" });`,
    `    }),`,
    `});`,
    ``,
  ];
  return lines.join("\n");
}

function dashboardPageTemplate(): string {
  const bt = "`"; // backtick character — avoids nested template literal confusion
  const lines = [
    `"use client";`,
    ``,
    `import { use, useState } from "react";`,
    `import { trpc } from "@/lib/trpc";`,
    `import { Plus, Loader2, Box } from "lucide-react";`,
    ``,
    `export default function ${moduleName}Page({ params }: { params: Promise<{ slug: string }> }) {`,
    `  const { slug } = use(params);`,
    ``,
    `  const { data: items, isLoading, refetch } = trpc.${routerKey}.list.useQuery();`,
    `  const deleteMut = trpc.${routerKey}.delete.useMutation({ onSuccess: () => refetch() });`,
    ``,
    `  const [showForm, setShowForm] = useState(false);`,
    `  const [name, setName] = useState("");`,
    ``,
    `  if (isLoading) {`,
    `    return (`,
    `      <div className="flex items-center justify-center h-full p-12">`,
    `        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />`,
    `      </div>`,
    `    );`,
    `  }`,
    ``,
    `  return (`,
    `    <div className="p-6 max-w-4xl mx-auto">`,
    `      {/* Header */}`,
    `      <div className="flex items-center justify-between mb-6">`,
    `        <div>`,
    `          <h1 className="text-xl font-semibold text-gray-900">${moduleName}</h1>`,
    `          <p className="text-sm text-gray-500 mt-0.5">${description}</p>`,
    `        </div>`,
    `        <button`,
    `          onClick={() => setShowForm(true)}`,
    `          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"`,
    `        >`,
    `          <Plus className="w-4 h-4" />`,
    `          New ${moduleName}`,
    `        </button>`,
    `      </div>`,
    ``,
    `      {/* Create form */}`,
    `      {showForm && (`,
    `        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">`,
    `          <h2 className="font-medium text-gray-900 mb-4">New ${moduleName}</h2>`,
    `          <div className="space-y-4">`,
    `            <div>`,
    `              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>`,
    `              <input`,
    `                type="text"`,
    `                value={name}`,
    `                onChange={(e) => setName(e.target.value)}`,
    `                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"`,
    `                placeholder="Enter name..."`,
    `              />`,
    `            </div>`,
    `            {/* TODO: add more fields */}`,
    `          </div>`,
    `          <div className="flex justify-end gap-3 mt-5">`,
    `            <button`,
    `              onClick={() => { setShowForm(false); setName(""); }}`,
    `              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"`,
    `            >`,
    `              Cancel`,
    `            </button>`,
    `            <button`,
    `              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"`,
    `              disabled={!name}`,
    `            >`,
    `              Create`,
    `            </button>`,
    `          </div>`,
    `        </div>`,
    `      )}`,
    ``,
    `      {/* Table */}`,
    `      {!items?.length ? (`,
    `        <div className="bg-white rounded-lg border border-gray-200 py-16 text-center">`,
    `          <Box className="w-8 h-8 text-gray-300 mx-auto mb-3" />`,
    `          <p className="text-sm text-gray-500">No ${moduleName.toLowerCase()} items yet.</p>`,
    `          <button`,
    `            onClick={() => setShowForm(true)}`,
    `            className="mt-3 text-sm text-blue-600 hover:underline"`,
    `          >`,
    `            Create the first one`,
    `          </button>`,
    `        </div>`,
    `      ) : (`,
    `        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">`,
    `          <table className="w-full text-sm">`,
    `            <thead className="bg-gray-50 border-b border-gray-200">`,
    `              <tr>`,
    `                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>`,
    `                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>`,
    `                <th className="w-16" />`,
    `              </tr>`,
    `            </thead>`,
    `            <tbody className="divide-y divide-gray-100">`,
    `              {items.map((item: any) => (`,
    `                <tr key={item.id} className="hover:bg-gray-50">`,
    `                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>`,
    `                  <td className="px-4 py-3 text-gray-500">`,
    `                    {new Date(item.createdAt).toLocaleDateString()}`,
    `                  </td>`,
    `                  <td className="px-4 py-3 text-right">`,
    `                    <button`,
    `                      onClick={() => deleteMut.mutate({ id: item.id })}`,
    `                      className="text-xs text-red-500 hover:text-red-700"`,
    `                    >`,
    `                      Delete`,
    `                    </button>`,
    `                  </td>`,
    `                </tr>`,
    `              ))}`,
    `            </tbody>`,
    `          </table>`,
    `        </div>`,
    `      )}`,
    `    </div>`,
    `  );`,
    `}`,
    ``,
  ];
  return lines.join("\n");
}

function schemaTemplate(): string {
  const lines = [
    `// Module: ${moduleArg}`,
    `import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";`,
    `import { tenants } from "./tenants";`,
    ``,
    `export const ${tableVar} = pgTable("${tableName}", {`,
    `  id: uuid("id").primaryKey().defaultRandom(),`,
    `  tenantId: uuid("tenant_id")`,
    `    .notNull()`,
    `    .references(() => tenants.id, { onDelete: "cascade" }),`,
    `  name: text("name").notNull(),`,
    `  // TODO: add more columns`,
    `  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),`,
    `  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),`,
    `});`,
    ``,
  ];
  return lines.join("\n");
}

// ─── Generate files ───────────────────────────────────────────────────────────

const apiRouterPath     = `apps/api/src/routers/${camelName}.ts`;
const dashboardPagePath = `apps/dashboard/src/app/[slug]/${kebabName}/page.tsx`;
const schemaPath        = `packages/db/src/schema/${kebabName}.ts`;

if (genApi) {
  if (existsSync(join(ROOT, apiRouterPath))) {
    console.log(`  skipped  ${apiRouterPath} (already exists)`);
  } else {
    write(apiRouterPath, apiRouterTemplate(), dryRun);
  }
}

if (genDashboard) {
  if (existsSync(join(ROOT, dashboardPagePath))) {
    console.log(`  skipped  ${dashboardPagePath} (already exists)`);
  } else {
    write(dashboardPagePath, dashboardPageTemplate(), dryRun);
  }
}

if (genSchema) {
  if (existsSync(join(ROOT, schemaPath))) {
    console.log(`  skipped  ${schemaPath} (already exists)`);
  } else {
    write(schemaPath, schemaTemplate(), dryRun);
  }
}

// ─── Patch router.ts ──────────────────────────────────────────────────────────

if (genApi) {
  patch(
    "apps/api/src/router.ts",
    (src) => {
      if (src.includes(`from "./routers/${camelName}"`)) return src;

      // Insert import line before `export const appRouter`
      const importLine = `import { ${routerVar} } from "./routers/${camelName}";\n`;
      src = src.replace(/^(export const appRouter)/m, importLine + "\n$1");

      // Insert router entry — find `public: publicRouter,` and append after it
      src = src.replace(
        /(public:\s*publicRouter,)/,
        `$1\n  ${routerKey}: ${routerVar},`,
      );

      return src;
    },
    dryRun,
  );
}

// ─── Patch schema/index.ts ────────────────────────────────────────────────────

if (genSchema) {
  patch(
    "packages/db/src/schema/index.ts",
    (src) => {
      const exportLine = `export * from "./${kebabName}";`;
      if (src.includes(exportLine)) return src;
      return src.trimEnd() + "\n" + exportLine + "\n";
    },
    dryRun,
  );
}

// ─── Patch sidebar.tsx ────────────────────────────────────────────────────────

if (genDashboard && genSidebar) {
  patch(
    "apps/dashboard/src/components/sidebar.tsx",
    (src) => {
      // 1. Add Box icon import if missing
      if (!src.includes("  Box,") && !src.includes("{ Box,") && !src.includes(" Box\n")) {
        // Insert Box on a new line before `} from "lucide-react";`
        src = src.replace(
          /(\n\} from "lucide-react";)/,
          `\n  Box,$1`,
        );
      }

      // 2. Add nav item before the Settings entry (string-based, no backtick in regex)
      if (src.includes(`/${kebabName}\``)) return src; // already present

      const settingsMarker = 'label: "Settings"';
      const idx = src.indexOf(settingsMarker);
      if (idx === -1) {
        // Fallback: append before closing ] of navItems array
        src = src.replace(
          /(\];[\s\n]*export function Sidebar)/,
          `  { href: \`/\${slug}/${kebabName}\`, label: "${moduleName}", icon: Box, module: "${moduleArg}" },\n$1`,
        );
      } else {
        // Insert a new line before the line containing "Settings"
        const lineStart = src.lastIndexOf("\n", idx) + 1;
        const newLine = `  { href: \`/\${slug}/${kebabName}\`, label: "${moduleName}", icon: Box, module: "${moduleArg}" },\n`;
        src = src.slice(0, lineStart) + newLine + src.slice(lineStart);
      }

      return src;
    },
    dryRun,
  );
}

// ─── Patch lib/modules.ts ─────────────────────────────────────────────────────

if (genDashboard) {
  patch(
    "apps/dashboard/src/lib/modules.ts",
    (src) => {
      if (src.includes(`"${moduleArg}"`)) return src; // already present

      const newEntry = [
        `  {`,
        `    name: "${moduleArg}",`,
        `    label: "${moduleName}",`,
        `    description: "${description}",`,
        `    core: false,`,
        `    route: "${kebabName}",`,
        `  },`,
      ].join("\n");

      // Insert before the closing comment marker
      const marker = "// ── Custom modules added by scaffold CLI appear below ───────────────────────";
      if (src.includes(marker)) {
        return src.replace(marker, marker + "\n" + newEntry);
      }
      // Fallback: insert before closing ] of MODULES array
      return src.replace(/\n\];\s*\n\/\/ ── Helpers/, `\n${newEntry}\n];\n\n// ── Helpers`);
    },
    dryRun,
  );
}

// ─── Patch modules.json ───────────────────────────────────────────────────────

{
  const newModule = {
    name: moduleArg,
    description,
    status: "active",
    version: "1.0.0",
    files: {
      router:    genApi       ? apiRouterPath                                       : null,
      dashboard: genDashboard ? `apps/dashboard/src/app/[slug]/${kebabName}/`      : null,
      storefront: [],
      schema:    genSchema    ? schemaPath                                           : null,
    },
  };

  patch(
    "modules.json",
    (src) => {
      const json = JSON.parse(src);
      if (json.modules.some((m: { name: string }) => m.name === moduleArg)) return src;
      json.modules.push(newModule);
      return JSON.stringify(json, null, 2) + "\n";
    },
    dryRun,
  );
}

// ─── Done ─────────────────────────────────────────────────────────────────────

const steps = [
  genSchema    ? `1. Edit   ${schemaPath}  -- define your columns` : null,
  genSchema    ? `2. Run    pnpm db:push  -- apply schema to database` : null,
  genApi       ? `3. Uncomment the schema import in  ${apiRouterPath}` : null,
  genApi       ? `4. Implement router procedures in  ${apiRouterPath}` : null,
  genDashboard ? `5. Build out the UI in  ${dashboardPagePath}` : null,
  genSidebar   ? "   Tip: change the sidebar icon (Box) to something fitting" : null,
].filter(Boolean);

console.log(`\nDone! Module ${moduleArg} scaffolded.\n\nNext steps:\n${steps.map((s) => `  ${s}`).join("\n")}\n`);
