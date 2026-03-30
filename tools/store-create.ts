#!/usr/bin/env tsx
/**
 * KStack — store:create
 * Run via: pnpm kstack store:create
 */
import * as readline from "node:readline/promises";
import { db } from "@kstack/db/client";
import { users, merchantUsers, tenants } from "@kstack/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function ask(prompt: string, hidden = false): Promise<string> {
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
}

async function main() {
  console.log("\n  KStack — Create a new store\n");

  const name    = await ask("  Owner name    : ");
  const email   = await ask("  Owner email   : ");
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

  const shopName  = await ask("  Shop name     : ");
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

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    console.error("\n  Error: An account with that email already exists.\n");
    process.exit(1);
  }

  const [existingTenant] = await db.select().from(tenants).where(eq(tenants.slug, shopSlug)).limit(1);
  if (existingTenant) {
    console.error(`\n  Error: The slug "${shopSlug}" is already taken.\n`);
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

    await tx.insert(merchantUsers).values({ userId: newUser.id, tenantId: newTenant.id, role: "owner" });

    return { user: newUser, tenant: newTenant };
  });

  const rootDomain = process.env["ROOT_DOMAIN"] ?? "localhost:3000";

  console.log([
    "",
    "  Store created successfully!",
    "",
    `  Shop name : ${result.tenant.name}`,
    `  Shop slug : ${result.tenant.slug}`,
    `  Email     : ${result.user.email}`,
    `  Dashboard : http://${result.tenant.slug}.${rootDomain}`,
    "",
    "  Log in with the email and password you just set.",
    "",
  ].join("\n"));
}

main().catch((err: unknown) => {
  console.error("\n  Error:", (err as Error).message ?? String(err));
  process.exit(1);
});
