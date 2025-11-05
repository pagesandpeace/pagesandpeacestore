"use client";

import { useState } from "react";

export default function LoyaltyJoinModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!acceptTerms) {
      setError("Please accept the Chapters Club Terms to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/loyalty/optin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          termsVersion: "v1.0",
          marketingConsent: acceptMarketing,
        }),
      });

      if (res.status === 401) {
        // 🚀 Not signed in: redirect to sign-up with loyalty flag
        window.location.href = "/sign-up?join=loyalty";
        return;
      }

      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || "Failed to join. Please try again.");
      }
    } catch (err) {
      console.error("Loyalty join error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 font-[Montserrat]">
      <div className="bg-[var(--background)] text-[var(--foreground)] rounded-2xl p-8 max-w-md w-full shadow-lg text-left">
        {/* ---- Header ---- */}
        <h2 className="text-2xl font-semibold mb-3 text-center text-[var(--accent)]">
          🌿 Join the Pages & Peace Loyalty Club
        </h2>
        <p className="text-sm mb-6 text-center text-[var(--foreground)]/80 leading-relaxed">
          Earn points with every coffee or book you buy — and become part of the{" "}
          <span className="font-semibold text-[var(--accent)]">
            Pages & Peace Chapters Club
          </span>
          , where local readers and neighbours share more than stories.
        </p>

        {/* ---- Benefits ---- */}
        <ul className="text-sm text-[var(--foreground)]/80 space-y-1.5 mb-6 list-disc pl-6">
          <li>Earn rewards with every purchase</li>
          <li>Unlock member-only perks and offers</li>
          <li>Be part of your local Chapter community</li>
        </ul>

        {/* ---- Checkboxes ---- */}
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 accent-[var(--accent)]"
            />
            <span>
              I agree to the{" "}
              <a
                href="/chapters-club-terms"
                target="_blank"
                className="underline text-[var(--accent)] hover:text-[var(--gold)] transition"
              >
                Chapters Club Terms (v1.0)
              </a>
              .
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acceptMarketing}
              onChange={(e) => setAcceptMarketing(e.target.checked)}
              className="mt-1 accent-[var(--accent)]"
            />
            <span>
              I consent to receive news and offers from Pages & Peace.
            </span>
          </label>
        </div>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        {/* ---- Actions ---- */}
        <div className="mt-8 flex justify-between gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-5 py-3 text-sm font-medium border-2 border-[var(--gold)] rounded-full text-[var(--foreground)] hover:bg-[var(--gold)] hover:text-[var(--background)] transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleJoin}
            disabled={submitting}
            className="flex-1 px-5 py-3 text-sm font-semibold border-2 border-[var(--gold)] bg-[var(--accent)] text-[var(--background)] rounded-full hover:bg-[var(--gold)] hover:border-[var(--gold)] transition-all disabled:opacity-60"
          >
            {submitting ? "Joining..." : "Join the Club"}
          </button>
        </div>
      </div>
    </div>
  );
}
