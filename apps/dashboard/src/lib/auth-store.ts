"use client";

// Simple in-memory + localStorage auth store.
// In production you'd use a more robust solution (Zustand, Jotai, etc.)

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string; name: string } | null;
  tenant: { id: string; slug: string; name: string } | null;
}

const STORAGE_KEY = "kstack_auth";

function getInitialState(): AuthState {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null, user: null, tenant: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { accessToken: null, refreshToken: null, user: null, tenant: null };
  } catch {
    return { accessToken: null, refreshToken: null, user: null, tenant: null };
  }
}

export function getAuthState(): AuthState {
  return getInitialState();
}

export function setAuthState(state: AuthState): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function clearAuthState(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getAccessToken(): string | null {
  return getInitialState().accessToken;
}

// ── Token refresh ─────────────────────────────────────────────────────────────

/** Decode JWT payload without verification (to read `exp`). */
function decodeJwtExp(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number };
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

/** True if token is missing or expires within the next 60 seconds. */
function isTokenExpiredOrExpiringSoon(token: string | null): boolean {
  if (!token) return true;
  const exp = decodeJwtExp(token);
  if (!exp) return true;
  return exp * 1000 < Date.now() + 60_000;
}

// Single in-flight refresh promise so concurrent requests share one refresh.
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const state = getInitialState();
  if (!state.refreshToken) return null;

  const API_URL =
    (typeof process !== "undefined" && process.env["NEXT_PUBLIC_API_URL"]) ||
    "http://localhost:3001";

  try {
    const res = await fetch(`${API_URL}/trpc/auth.refresh?batch=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": { json: { refreshToken: state.refreshToken } } }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Array<{
      result?: { data?: { json?: { accessToken?: string; refreshToken?: string } } };
    }>;
    const result = data[0]?.result?.data?.json;
    if (!result?.accessToken || !result?.refreshToken) return null;

    setAuthState({ ...state, accessToken: result.accessToken, refreshToken: result.refreshToken });
    return result.accessToken;
  } catch {
    return null;
  }
}

/**
 * Returns a valid access token, refreshing silently if the current one is
 * expired or about to expire. Returns null if both tokens are invalid —
 * the caller should redirect to /login.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const state = getInitialState();

  if (!isTokenExpiredOrExpiringSoon(state.accessToken)) {
    return state.accessToken;
  }

  // De-duplicate concurrent refreshes
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }

  return refreshPromise;
}
