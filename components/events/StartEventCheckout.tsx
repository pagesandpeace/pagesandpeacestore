"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

export default function StartEventCheckout({
  eventId,
  maxQuantity,
}: {
  eventId: string;
  maxQuantity: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);

  function decrement() {
    setQuantity((q) => Math.max(1, q - 1));
  }

  function increment() {
    setQuantity((q) => Math.min(maxQuantity, q + 1));
  }

  async function handleCheckout() {
    setError("");

    startTransition(async () => {
      // 1. Check login status
      const meRes = await fetch("/api/me", {
        cache: "no-store",
        credentials: "include",
      });

      const me = await meRes.json();

      if (!me?.id) {
        router.push(`/sign-in?callbackURL=/dashboard/events/${eventId}`);
        return;
      }

      // 2. Start checkout with quantity
      const res = await fetch("/api/events/start-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventId,
          quantity,
        }),
      });

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      setError("Unable to start checkout. Please try again.");
    });
  }

  return (
    <div className="space-y-6">
      {/* QUANTITY SELECTOR */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={decrement}
          disabled={quantity <= 1}
          className="w-10 h-10 rounded-full border text-xl font-semibold disabled:opacity-40"
          aria-label="Decrease quantity"
        >
          −
        </button>

        <div className="min-w-[40px] text-center text-lg font-semibold">
          {quantity}
        </div>

        <button
          onClick={increment}
          disabled={quantity >= maxQuantity}
          className="w-10 h-10 rounded-full border text-xl font-semibold disabled:opacity-40"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <p className="text-sm text-neutral-500 text-center">
        {maxQuantity} seats remaining
      </p>

      {/* CHECKOUT BUTTON */}
      <button
  onClick={handleCheckout}
  disabled={isPending}
  className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition w-full disabled:opacity-60"
>
  {isPending ? "Starting Checkout…" : "Proceed to Checkout"}
</button>

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
