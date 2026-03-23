"use client";

// Simple in-memory + localStorage auth store.
// In production you'd use a more robust solution (Zustand, Jotai, etc.)

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string; name: string } | null;
  tenant: { id: string; slug: string; name: string } | null;
}

const STORAGE_KEY = "kasify_auth";

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
