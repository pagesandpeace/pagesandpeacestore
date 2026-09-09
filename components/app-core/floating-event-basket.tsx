"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "app_core_event_basket_v1";

export function FloatingEventBasket() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const refresh = () => {
      try {
        const items = JSON.parse(localStorage.getItem(KEY) ?? "[]") as { quantity?: number }[];
        setCount(items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity ?? 0)), 0));
      } catch { setCount(0); }
    };
    refresh();
    window.addEventListener("app-core-basket-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("app-core-basket-changed", refresh); window.removeEventListener("storage", refresh); };
  }, []);
  if (!count) return null;
  return <Link href="/events/checkout" aria-label={`View basket with ${count} ticket${count === 1 ? "" : "s"}`} className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-xl ring-1 ring-white/20 sm:bottom-6 sm:right-6"><span aria-hidden="true">🎟️</span><span>{count} ticket{count === 1 ? "" : "s"}</span><span aria-hidden="true">→</span></Link>;
}
