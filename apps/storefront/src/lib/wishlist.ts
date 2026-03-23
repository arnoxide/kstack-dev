"use client";

export interface WishlistItem {
  productId: string;
  handle: string;
  title: string;
  primaryImage: string | null;
  minPrice: number | null;
}

const KEY = (tenantId: string) => `kasify_wishlist_${tenantId}`;

export function getWishlist(tenantId: string): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY(tenantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Support legacy format (array of strings)
    if (Array.isArray(parsed) && typeof parsed[0] === "string") return [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getWishlistIds(tenantId: string): string[] {
  return getWishlist(tenantId).map((i) => i.productId);
}

export function toggleWishlist(tenantId: string, item: WishlistItem): WishlistItem[] {
  const list = getWishlist(tenantId);
  const exists = list.some((i) => i.productId === item.productId);
  const next = exists ? list.filter((i) => i.productId !== item.productId) : [...list, item];
  localStorage.setItem(KEY(tenantId), JSON.stringify(next));
  return next;
}

export function isInWishlist(tenantId: string, productId: string): boolean {
  return getWishlistIds(tenantId).includes(productId);
}
