"use client";
// Module: Kasify_AIAssistant

import { useEffect, useState } from "react";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@kasify/api/router";
import Link from "next/link";
import { Sparkles } from "lucide-react";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

const client = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `${API_URL}/trpc` })],
});

interface Recommendation {
  id: string;
  title: string;
  handle: string;
  price: string | null;
}

interface Props {
  tenantId: string;
  shopSlug: string;
  productId?: string;
  currency?: string;
}

export function AIRecommendations({ tenantId, shopSlug, productId, currency = "ZAR" }: Props) {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    client.aiAssistant.recommendations
      .query({ tenantId, productId, limit: 4 })
      .then((data) => {
        setItems(data as Recommendation[]);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [tenantId, productId]);

  if (!loaded || items.length === 0) return null;

  const fmt = (price: string | null) => {
    if (!price) return null;
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(Number(price));
  };

  return (
    <section className="mt-16 border-t border-gray-100 pt-12">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-4 h-4 text-shop-accent" />
        <h2 className="text-lg font-semibold text-gray-900">You might also like</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/${shopSlug}/products/${item.handle}`}
            className="group block"
          >
            {/* Placeholder image area */}
            <div className="aspect-square bg-gray-100 rounded-shop overflow-hidden mb-3 group-hover:bg-gray-200 transition-colors flex items-center justify-center">
              <span className="text-gray-300 text-3xl font-bold select-none">
                {item.title.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-gray-700">
              {item.title}
            </p>
            {item.price && (
              <p className="text-sm text-shop-accent font-medium mt-0.5">
                {fmt(item.price)}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
