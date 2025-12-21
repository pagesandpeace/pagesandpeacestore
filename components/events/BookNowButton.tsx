"use client";

import { useEffect, useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";

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
  const [quantity, setQuantity] = useState(1);

  /* -----------------------------
     CHECK LOGIN STATUS
  ----------------------------- */
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const res = await fetch("/api/me", {
          cache: "no-store",
          credentials: "include",
        });
        const me = await res.json();
        if (!active) return;
        setLoggedIn(Boolean(me?.id));
      } catch {
        setLoggedIn(false);
      }
    }

    checkSession();
    window.addEventListener("pp:auth-updated", checkSession);
    return () => {
      active = false;
      window.removeEventListener("pp:auth-updated", checkSession);
    };
  }, []);

  /* -----------------------------
     CLICK HANDLER
  ----------------------------- */
  const handleBookNow = async () => {
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

    const checkoutRes = await fetch("/api/events/start-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        eventId,
        slug,
        quantity, // ✅ SEND QUANTITY
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
      {/* QUANTITY SELECTOR */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
          className="px-3 py-2 rounded-lg border text-lg disabled:opacity-40"
        >
          −
        </button>

        <span className="text-lg font-semibold min-w-[2ch] text-center">
          {quantity}
        </span>

        <button
          type="button"
          onClick={() =>
            setQuantity((q) => Math.min(remainingSeats, q + 1))
          }
          disabled={quantity >= remainingSeats}
          className="px-3 py-2 rounded-lg border text-lg disabled:opacity-40"
        >
          +
        </button>
      </div>

      {/* ACTION BUTTON */}
      <button
        onClick={handleBookNow}
        disabled={loading || remainingSeats <= 0}
        className="bg-[var(--accent)] text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition w-full"
      >
        {loading
          ? "Loading…"
          : loggedIn
          ? `Checkout (${quantity} ticket${quantity > 1 ? "s" : ""})`
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
