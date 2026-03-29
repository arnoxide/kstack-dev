"use client";

import { useState } from "react";
import { useCart } from "@/context/cart-context";
import { ShoppingBag, Check } from "lucide-react";
import Link from "next/link";

interface AddToCartButtonProps {
  tenantId: string;
  shopSlug: string;
  item: {
    variantId: string;
    productId: string;
    title: string;
    variantTitle: string;
    price: number;
    imageUrl: string | null;
    inventory?: number;
  };
}

export function AddToCartButton({ tenantId, shopSlug, item }: AddToCartButtonProps) {
  const { add, cart } = useCart();
  const [added, setAdded] = useState(false);

  const currentQty = cart.items.find((i) => i.variantId === item.variantId)?.quantity ?? 0;
  const atMax = item.inventory != null && currentQty >= item.inventory;

  const handleAdd = () => {
    if (atMax) return;
    add({ ...item });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleAdd}
        disabled={atMax}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm transition-all ${
          atMax
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : added
            ? "bg-green-600 text-white"
            : "bg-shop-accent text-shop-accent-fg hover:bg-shop-accent"
        }`}
      >
        {atMax ? (
          <>
            <ShoppingBag className="w-4 h-4" />
            Max qty in cart ({item.inventory})
          </>
        ) : added ? (
          <>
            <Check className="w-4 h-4" />
            Added to cart
          </>
        ) : (
          <>
            <ShoppingBag className="w-4 h-4" />
            Add to Cart
          </>
        )}
      </button>

      {added && (
        <Link
          href={`/${shopSlug}/cart`}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View Cart
        </Link>
      )}
    </div>
  );
}
