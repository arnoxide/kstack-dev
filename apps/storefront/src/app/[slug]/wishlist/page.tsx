"use client";

import { use, useEffect, useState } from "react";
import { useCart } from "@/context/cart-context";
import { getWishlist, toggleWishlist, type WishlistItem } from "@/lib/wishlist";
import { formatCurrency } from "@/lib/utils";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function WishlistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { cart, add } = useCart();
  const tenantId = cart.tenantId;

  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    setItems(getWishlist(tenantId));
  }, [tenantId]);

  const remove = (productId: string) => {
    const item = items.find((i) => i.productId === productId)!;
    const next = toggleWishlist(tenantId, item);
    setItems(next);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h1>
        <p className="text-gray-500 text-sm mb-6">Save items you love and find them here later.</p>
        <Link
          href={`/${slug}/products`}
          className="inline-block bg-shop-accent text-shop-accent-fg px-8 py-3 rounded-shop font-medium hover:bg-shop-accent transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Wishlist <span className="text-gray-400 font-normal text-lg">({items.length})</span>
        </h1>
        <Link href={`/${slug}/products`} className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2">
          Continue shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.productId} className="group border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
            <Link href={`/${slug}/products/${item.handle}`} className="block">
              <div className="relative aspect-square bg-gray-100 overflow-hidden">
                {item.primaryImage ? (
                  <Image
                    src={item.primaryImage}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ShoppingBag className="w-12 h-12" />
                  </div>
                )}
              </div>
            </Link>

            <div className="p-4">
              <Link href={`/${slug}/products/${item.handle}`}>
                <h3 className="text-sm font-semibold text-gray-900 hover:underline line-clamp-2 leading-snug">{item.title}</h3>
              </Link>
              {item.minPrice != null && (
                <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(item.minPrice)}</p>
              )}

              <div className="flex gap-2 mt-3">
                <Link
                  href={`/${slug}/products/${item.handle}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-shop-primary hover:bg-shop-accent text-shop-accent-fg py-2 rounded-shop transition-colors font-medium"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> View Product
                </Link>
                <button
                  onClick={() => remove(item.productId)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 rounded-lg transition-colors"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
