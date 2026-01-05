"use client";

import { useEffect, useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";

type TicketType = {
  id: string;
  name: string;
  price_pence: number;
  is_default: boolean;
};

export default function BookNowButton({
  eventId,
  slug,
  remainingSeats,
}: {
  eventId: string;
  slug: string;
  remainingSeats: number;
}) {
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  /* -----------------------------
     CHECK LOGIN STATUS
  ----------------------------- */
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/me", {
          cache: "no-store",
          credentials: "include",
        });
        const me = await res.json();
        setLoggedIn(Boolean(me?.id));
      } catch {
        setLoggedIn(false);
      }
    }

    checkSession();
    window.addEventListener("pp:auth-updated", checkSession);
    return () =>
      window.removeEventListener("pp:auth-updated", checkSession);
  }, []);

  /* -----------------------------
     LOAD TICKET TYPES (PUBLIC)
  ----------------------------- */
  useEffect(() => {
    async function loadTickets() {
      const res = await fetch(`/api/events/${eventId}/tickets`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data: TicketType[] = await res.json();
      setTickets(data);

      // initialise quantities
      const initial: Record<string, number> = {};
      for (const t of data) initial[t.id] = 0;
      setQuantities(initial);
    }

    loadTickets();
  }, [eventId]);

  /* -----------------------------
     DERIVED TOTALS
  ----------------------------- */
  const totalSelected = Object.values(quantities).reduce(
    (sum, q) => sum + q,
    0
  );

  const totalPrice = tickets.reduce((sum, t) => {
    const q = quantities[t.id] ?? 0;
    return sum + q * t.price_pence;
  }, 0);

  /* -----------------------------
     CHECKOUT
  ----------------------------- */
  const handleBookNow = async () => {
    if (totalSelected === 0) {
      alert("Please select at least one ticket.");
      return;
    }

    if (totalSelected > remainingSeats) {
      alert("Not enough seats remaining.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/me", {
      cache: "no-store",
      credentials: "include",
    });
    const me = await res.json();

    if (!me?.id) {
      setShowAuthPrompt(true);
      setLoading(false);
      return;
    }

    const items = Object.entries(quantities)
      .filter(([_, q]) => q > 0)
      .map(([ticketTypeId, quantity]) => ({
        ticketTypeId,
        quantity,
      }));

    const checkoutRes = await fetch("/api/events/start-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        eventId,
        items,
      }),
    });

    if (!checkoutRes.ok) {
      alert("Something went wrong starting checkout.");
      setLoading(false);
      return;
    }

    const data = await checkoutRes.json();
    window.location.href = data.url;
  };

  /* -----------------------------
     RENDER
  ----------------------------- */
  return (
    <>
      {/* TICKET TYPES */}
      <div className="space-y-4 mb-6">
        {tickets.map((t) => {
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
                      [t.id]: Math.min(remainingSeats, qty + 1),
                    }))
                  }
                  disabled={totalSelected >= remainingSeats}
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
      <div className="text-sm text-neutral-600 mb-4 text-center">
        {totalSelected} ticket{totalSelected !== 1 ? "s" : ""} selected · £
        {(totalPrice / 100).toFixed(2)}
      </div>

      {/* CTA */}
      <button
        onClick={handleBookNow}
        disabled={loading || remainingSeats <= 0 || totalSelected === 0}
        className="bg-accent text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition w-full disabled:opacity-50"
      >
        {loading
          ? "Loading…"
          : loggedIn
          ? "Proceed to Checkout"
          : "Book Now"}
      </button>

      <AuthPromptModal
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        callbackURL={`/events/${slug}`}
      />
    </>
  );
}
