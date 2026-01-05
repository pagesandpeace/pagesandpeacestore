"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type TicketType = {
  id: string;
  name: string;
  price_pence: number;
  is_default: boolean;
};

export default function StartEventCheckout({
  eventId,
  ticketTypes,
  maxQuantity,
}: {
  eventId: string;
  ticketTypes: TicketType[];
  maxQuantity: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  /* ----------------------------------------
     PER-TICKET QUANTITIES
  ---------------------------------------- */
  const [quantities, setQuantities] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        ticketTypes.map((t) => [t.id, 0])
      )
  );

  /* ----------------------------------------
     DERIVED TOTALS
  ---------------------------------------- */
  const totalSelected = Object.values(quantities).reduce(
    (sum, q) => sum + q,
    0
  );

  const totalPricePence = ticketTypes.reduce((sum, t) => {
    const q = quantities[t.id] ?? 0;
    return sum + q * t.price_pence;
  }, 0);

  /* ----------------------------------------
     CHECKOUT
  ---------------------------------------- */
  async function handleCheckout() {
    if (totalSelected === 0) {
      setError("Please select at least one ticket.");
      return;
    }

    if (totalSelected > maxQuantity) {
      setError("Not enough seats remaining.");
      return;
    }

    setError("");

    startTransition(async () => {
      const meRes = await fetch("/api/me", {
        cache: "no-store",
        credentials: "include",
      });

      const me = await meRes.json();

      if (!me?.id) {
        router.push(`/sign-in?callbackURL=/events/${eventId}`);
        return;
      }

      const items = Object.entries(quantities)
        .filter(([_, q]) => q > 0)
        .map(([ticketTypeId, quantity]) => ({
          ticketTypeId,
          quantity,
        }));

      const res = await fetch("/api/events/start-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventId,
          items,
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

  /* ----------------------------------------
     RENDER
  ---------------------------------------- */
  return (
    <div className="space-y-6">
      {/* TICKET TYPES */}
      <div className="space-y-4">
        {ticketTypes.map((t) => {
          const qty = quantities[t.id] ?? 0;

          return (
            <div
              key={t.id}
              className="flex items-center justify-between border rounded-lg px-4 py-3"
            >
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-sm text-neutral-500">
                  £{(t.price_pence / 100).toFixed(2)}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setQuantities((prev) => ({
                      ...prev,
                      [t.id]: Math.max(0, qty - 1),
                    }))
                  }
                  disabled={qty === 0}
                  className="w-8 h-8 rounded-full border text-lg disabled:opacity-40"
                >
                  −
                </button>

                <span className="min-w-[2ch] text-center font-semibold">
                  {qty}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantities((prev) => ({
                      ...prev,
                      [t.id]: Math.min(maxQuantity, qty + 1),
                    }))
                  }
                  disabled={totalSelected >= maxQuantity}
                  className="w-8 h-8 rounded-full border text-lg disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* SUMMARY */}
      <div className="text-sm text-neutral-600 text-center">
        {totalSelected} ticket{totalSelected !== 1 ? "s" : ""} selected · £
        {(totalPricePence / 100).toFixed(2)}
      </div>

      {/* CTA */}
      <button
        onClick={handleCheckout}
        disabled={isPending || totalSelected === 0}
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
