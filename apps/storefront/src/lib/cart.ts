"use client";

export interface CartItem {
  variantId: string;
  productId: string;
  title: string;
  variantTitle: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  tenantId: string;
}

const KEY = (tenantId: string) => `kstack_cart_${tenantId}`;

export function getCart(tenantId: string): Cart {
  if (typeof window === "undefined") return { items: [], tenantId };
  try {
    const raw = localStorage.getItem(KEY(tenantId));
    return raw ? JSON.parse(raw) : { items: [], tenantId };
  } catch {
    return { items: [], tenantId };
  }
}

export function saveCart(cart: Cart): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY(cart.tenantId), JSON.stringify(cart));
}

export function addToCart(tenantId: string, item: Omit<CartItem, "quantity"> & { quantity?: number }): Cart {
  const cart = getCart(tenantId);
  const existing = cart.items.find((i) => i.variantId === item.variantId);
  if (existing) {
    existing.quantity += item.quantity ?? 1;
  } else {
    cart.items.push({ ...item, quantity: item.quantity ?? 1 });
  }
  saveCart(cart);
  return cart;
}

export function removeFromCart(tenantId: string, variantId: string): Cart {
  const cart = getCart(tenantId);
  cart.items = cart.items.filter((i) => i.variantId !== variantId);
  saveCart(cart);
  return cart;
}

export function updateQuantity(tenantId: string, variantId: string, quantity: number): Cart {
  const cart = getCart(tenantId);
  if (quantity <= 0) return removeFromCart(tenantId, variantId);
  const item = cart.items.find((i) => i.variantId === variantId);
  if (item) item.quantity = quantity;
  saveCart(cart);
  return cart;
}

export function clearCart(tenantId: string): Cart {
  const cart = { items: [], tenantId };
  saveCart(cart);
  return cart;
}

export function cartTotal(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function cartCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}
