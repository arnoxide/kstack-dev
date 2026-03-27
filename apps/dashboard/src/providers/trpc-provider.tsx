"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { getValidAccessToken, clearAuthState } from "@/lib/auth-store";
import { trpc } from "@/lib/trpc";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_URL}/trpc`,
      async headers() {
        const token = await getValidAccessToken();
        if (!token && typeof window !== "undefined") {
          const path = window.location.pathname;
          // Only redirect to login from protected pages, not from auth pages themselves
          if (!path.startsWith("/login") && !path.startsWith("/register")) {
            clearAuthState();
            window.location.href = "/login";
            return {};
          }
        }
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => queryClient);
  const [tc] = useState(() => trpcClient);

  return (
    <trpc.Provider client={tc} queryClient={qc}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
