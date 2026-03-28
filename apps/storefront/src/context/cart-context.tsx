"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  type Cart,
  type CartItem,
  addToCart,
  cartCount,
  cartTotal,
  clearCart,
  getCart,
  removeFromCart,
  updateQuantity,
} from "@/lib/cart";
import { gtagAddToCart } from "@/lib/gtag";

interface CartContextValue {
  cart: Cart;
  count: number;
  total: number;
  add: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  remove: (variantId: string) => void;
  update: (variantId: string, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ tenantId, children }: { tenantId: string; children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [], tenantId });

  useEffect(() => {
    setCart(getCart(tenantId));
  }, [tenantId]);

  const add = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setCart(addToCart(tenantId, item));
      gtagAddToCart({
        item_id: item.variantId,
        item_name: item.title,
        item_variant: item.variantTitle !== "Default Title" ? item.variantTitle : undefined,
        price: item.price,
        quantity: item.quantity ?? 1,
      });
    },
    [tenantId],
  );

  const remove = useCallback(
    (variantId: string) => setCart(removeFromCart(tenantId, variantId)),
    [tenantId],
  );

  const update = useCallback(
    (variantId: string, quantity: number) => setCart(updateQuantity(tenantId, variantId, quantity)),
    [tenantId],
  );

  const clear = useCallback(() => setCart(clearCart(tenantId)), [tenantId]);

  return (
    <CartContext.Provider
      value={{ cart, count: cartCount(cart), total: cartTotal(cart), add, remove, update, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
