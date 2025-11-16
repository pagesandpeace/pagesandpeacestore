"use client";

import { useEffect, useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";

export default function BookNowButton({ eventId }: { eventId: string }) {
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  /* --------------------------------------------------
     CHECK LOGIN STATUS ON MOUNT (NO FLICKER)
  --------------------------------------------------- */
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const me = await res.json();

        if (!active) return;

        setLoggedIn(Boolean(me?.id));
      } catch {
        setLoggedIn(false);
      }
    }

    checkSession();

    // Re-check when returning from OAuth or email login
    window.addEventListener("pp:auth-updated", checkSession);

    return () => {
      active = false;
      window.removeEventListener("pp:auth-updated", checkSession);
    };
  }, []);

  /* --------------------------------------------------
     CLICK HANDLER
  --------------------------------------------------- */
  const handleBookNow = async () => {
    setLoading(true);

    const res = await fetch("/api/me", { cache: "no-store" });
    const me = await res.json();

    if (!me?.id) {
      // Not logged in → open modal
      setShowAuthPrompt(true);
      setLoading(false);
      return;
    }

    // Logged in → start checkout
    const checkoutRes = await fetch("/api/events/start-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ eventId }),
    });

    if (!checkoutRes.ok) {
      alert("Something went wrong starting checkout.");
      setLoading(false);
      return;
    }

    const data = await checkoutRes.json();

    // Redirect to Stripe
    window.location.href = data.url;
  };

  /* --------------------------------------------------
     UI
  --------------------------------------------------- */
  return (
    <>
      <button
        onClick={handleBookNow}
        disabled={loading}
        className="bg-[var(--accent)] text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition"
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
        callbackURL={`/events/${eventId}`}
      />
    </>
  );
}
