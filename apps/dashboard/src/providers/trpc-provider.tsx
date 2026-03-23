"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { getAccessToken } from "@/lib/auth-store";
import { trpc } from "@/lib/trpc";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

// Create these outside the component so they are stable singletons and
// the headers() callback always reads localStorage at call-time (not at init).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_URL}/trpc`,
      headers() {
        const token = getAccessToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  // Use stable singleton references — no useState needed
  const [qc] = useState(() => queryClient);
  const [tc] = useState(() => trpcClient);

  return (
    <trpc.Provider client={tc} queryClient={qc}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
