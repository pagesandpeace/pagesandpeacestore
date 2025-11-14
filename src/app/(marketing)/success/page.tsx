// src/app/(marketing)/success/page.tsx
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function SuccessPage() {
  const { clearCart } = useCart();
  const hasCleared = useRef(false);

  useEffect(() => {
    if (!hasCleared.current) {
      hasCleared.current = true;
      clearCart();
    }
  }, [clearCart]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--background)] text-[var(--foreground)]">
      <h1 className="text-2xl font-semibold mb-2">Payment successful 🎉</h1>
      <p className="opacity-80 mb-6 text-center max-w-md">
        Thanks for your order. Your receipt has been emailed to you and your
        cart has been cleared.
      </p>
      <div className="flex gap-4">
        <Link href="/dashboard/orders" className="underline text-[var(--accent)]">
          View my orders
        </Link>
        <Link href="/shop" className="underline text-[var(--accent)]">
          Back to shop
        </Link>
      </div>
    </main>
  );
}
