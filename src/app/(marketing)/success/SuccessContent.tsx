"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function SuccessContent() {
  const { clearCart } = useCart();
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  const hasProcessed = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing payment session ID.");
      setLoading(false);
      return;
    }

    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const run = async () => {
      try {
        const res = await fetch(`/api/orders/success?session_id=${sessionId}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to create order.");
          return;
        }

        clearCart();
      } catch (err) {
        console.error("❌ Success page error:", err);
        setError("Unable to process your order.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [sessionId, clearCart]);

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-lg opacity-70">Finalising your order…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Order Processing Error</h1>
        <p className="opacity-80 mb-6 max-w-md">{error}</p>

        <Link href="/shop" className="underline text-[var(--accent)]">
          Back to shop
        </Link>
      </main>
    );
  }

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
