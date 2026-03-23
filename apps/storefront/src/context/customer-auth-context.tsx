"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@kasify/api";
import { api } from "@/lib/api";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

function authedClient(token: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${API_URL}/trpc`,
        headers: () => ({ Authorization: `Bearer ${token}` }),
      }),
    ],
  });
}

export interface CustomerAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface CustomerProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  totalOrders: number;
  totalSpent: number;
  defaultAddress: CustomerAddress | null;
}

interface CustomerAuthContextValue {
  token: string | null;
  customer: CustomerProfile | null;
  loading: boolean;
  login: (tenantId: string, email: string, password: string) => Promise<void>;
  register: (tenantId: string, data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  getAuthedClient: () => ReturnType<typeof authedClient> | null;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

const TOKEN_KEY = (tenantId: string) => `kasify_customer_token_${tenantId}`;

export function CustomerAuthProvider({ tenantId, children }: { tenantId: string; children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (t: string) => {
    try {
      const result = await authedClient(t).customerAuth.me.query();
      setCustomer(result);
    } catch {
      setToken(null);
      setCustomer(null);
      localStorage.removeItem(TOKEN_KEY(tenantId));
    }
  }, [tenantId]);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY(tenantId));
    if (saved) {
      setToken(saved);
      loadProfile(saved).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [tenantId, loadProfile]);

  const login = async (tid: string, email: string, password: string) => {
    const result = await api.customerAuth.login.mutate({ tenantId: tid, email, password });
    setToken(result.token);
    setCustomer(result.customer as CustomerProfile);
    localStorage.setItem(TOKEN_KEY(tid), result.token);
  };

  const register = async (tid: string, data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => {
    const result = await api.customerAuth.register.mutate({ tenantId: tid, ...data });
    setToken(result.token);
    localStorage.setItem(TOKEN_KEY(tid), result.token);
    await loadProfile(result.token);
  };

  const logout = useCallback(() => {
    setToken(null);
    setCustomer(null);
    localStorage.removeItem(TOKEN_KEY(tenantId));
  }, [tenantId]);

  const refresh = useCallback(async () => {
    if (token) await loadProfile(token);
  }, [token, loadProfile]);

  const getAuthedClient = useCallback(() => {
    return token ? authedClient(token) : null;
  }, [token]);

  return (
    <CustomerAuthContext.Provider value={{ token, customer, loading, login, register, logout, refresh, getAuthedClient }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used inside CustomerAuthProvider");
  return ctx;
}
