"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { isInWishlist, toggleWishlist, type WishlistItem } from "@/lib/wishlist";

interface WishlistButtonProps {
  tenantId: string;
  item: WishlistItem;
  className?: string;
}

export function WishlistButton({ tenantId, item, className = "" }: WishlistButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isInWishlist(tenantId, item.productId));
  }, [tenantId, item.productId]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleWishlist(tenantId, item);
    setSaved(next.some((i) => i.productId === item.productId));
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      className={`flex items-center justify-center rounded-full transition-colors ${saved ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-white/80 text-gray-400 hover:text-red-400 hover:bg-red-50"} ${className}`}
    >
      <Heart className={`w-4 h-4 ${saved ? "fill-red-500" : ""}`} />
    </button>
  );
}
