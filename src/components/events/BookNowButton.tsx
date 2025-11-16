"use client";

import { useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";

export default function BookNowButton({ eventId }: { eventId: string }) {
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBookNow = async () => {
    setLoading(true);

    // Check if logged in
    const res = await fetch("/api/me");
    const me = await res.json();

    if (!me?.id) {
      // Not logged in → show modal
      setShowAuthPrompt(true);
      setLoading(false);
      return;
    }

    // Logged in → Begin event checkout
    const checkoutRes = await fetch("/api/events/checkout", {
      method: "POST",
      body: JSON.stringify({ eventId }),
    });

    const data = await checkoutRes.json();

    if (!checkoutRes.ok) {
      alert("Failed to start checkout");
      setLoading(false);
      return;
    }

    // Redirect to Stripe
    window.location.href = data.url;
  };

  return (
    <>
      <button
        onClick={handleBookNow}
        disabled={loading}
        className="bg-[var(--accent)] text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition"
      >
        {loading ? "Loading…" : "Book Now"}
      </button>

      <AuthPromptModal
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        callbackURL={`/dashboard/events/${eventId}`}  // ⭐ FIXED
      />
    </>
  );
}
