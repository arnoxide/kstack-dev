"use client";

import { useEffect } from "react";
import { gtagViewItem } from "@/lib/gtag";

export function GaViewItem({
  id,
  title,
  price,
  category,
}: {
  id: string;
  title: string;
  price: number;
  category?: string;
}) {
  useEffect(() => {
    gtagViewItem({ item_id: id, item_name: title, ...(category && { item_category: category }), price, quantity: 1 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return null;
}
