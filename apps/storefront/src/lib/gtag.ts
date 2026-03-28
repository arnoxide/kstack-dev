/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function fire(name: string, params: Record<string, any>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

export interface GaItem {
  item_id: string;
  item_name: string;
  item_variant?: string;
  item_category?: string;
  price: number;
  quantity: number;
}

export function gtagViewItem(item: GaItem) {
  fire("view_item", { currency: "ZAR", value: item.price, items: [item] });
}

export function gtagAddToCart(item: GaItem) {
  fire("add_to_cart", { currency: "ZAR", value: item.price * item.quantity, items: [item] });
}

export function gtagBeginCheckout(items: GaItem[], value: number) {
  fire("begin_checkout", { currency: "ZAR", value, items });
}

export function gtagPurchase(transactionId: string | number, value: number, items: GaItem[], shipping?: number) {
  fire("purchase", { transaction_id: String(transactionId), currency: "ZAR", value, shipping: shipping ?? 0, items });
}
