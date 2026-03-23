import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

const connectionString =
  process.env["DATABASE_URL"] ?? "postgresql://kasify:kasify@localhost:5432/kasify";

// For query purposes (connection pool)
const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema, logger: process.env["NODE_ENV"] === "development" });

export type Database = typeof db;

// Helper: run a function within a transaction
export async function withTransaction<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (tx: any) => Promise<T>,
): Promise<T> {
  return db.transaction(fn);
}
