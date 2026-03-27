import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@kstack/api";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

// Server-side tRPC client (used in Server Components / Route Handlers)
export const api = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `${API_URL}/trpc` })],
});
