"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { AddToCartButton } from "./add-to-cart-button";

interface Variant {
  id: string;
  title: string;
  price: string | number;
  comparePrice: string | number | null;
  inventory: number;
}

interface ProductVariantSelectorProps {
  tenantId: string;
  shopSlug: string;
  productId: string;
  productTitle: string;
  primaryImage: string | null;
  variants: Variant[];
}

export function ProductVariantSelector({
  tenantId,
  shopSlug,
  productId,
  productTitle,
  primaryImage,
  variants,
}: ProductVariantSelectorProps) {
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "");

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const price = selected ? Number(selected.price) : 0;
  const comparePrice = selected?.comparePrice ? Number(selected.comparePrice) : null;
  const discount =
    comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : null;

  return (
    <div>
      {/* Price */}
      <div className="flex items-baseline gap-3 mt-4">
        <span className="text-2xl font-bold text-gray-900">{formatCurrency(price)}</span>
        {comparePrice && comparePrice > price && (
          <>
            <span className="text-lg text-gray-400 line-through">{formatCurrency(comparePrice)}</span>
            <span className="text-sm bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
              {discount}% off
            </span>
          </>
        )}
      </div>

      {/* Variant buttons (only shown when there are multiple) */}
      {variants.length > 1 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Options</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                  v.id === selectedId
                    ? "border-shop-accent bg-shop-accent text-shop-accent-fg"
                    : "border-gray-300 hover:border-shop-accent text-gray-700"
                } ${v.inventory <= 0 ? "opacity-40 cursor-not-allowed line-through" : ""}`}
                disabled={v.inventory <= 0}
              >
                {v.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stock notice */}
      {selected && selected.inventory <= 0 && (
        <p className="mt-3 text-sm text-red-600 font-medium">Out of stock</p>
      )}
      {selected && selected.inventory > 0 && selected.inventory <= 5 && (
        <p className="mt-3 text-sm text-orange-600 font-medium">
          Only {selected.inventory} left
        </p>
      )}

      {/* Add to cart */}
      <div className="mt-8">
        {selected && selected.inventory > 0 ? (
          <AddToCartButton
            tenantId={tenantId}
            shopSlug={shopSlug}
            item={{
              variantId: selected.id,
              productId,
              title: productTitle,
              variantTitle: selected.title,
              price,
              imageUrl: primaryImage,
            }}
          />
        ) : (
          <button
            disabled
            className="w-full py-3.5 rounded-full font-semibold text-sm bg-gray-200 text-gray-400 cursor-not-allowed"
          >
            Out of Stock
          </button>
        )}
      </div>
    </div>
  );
}
