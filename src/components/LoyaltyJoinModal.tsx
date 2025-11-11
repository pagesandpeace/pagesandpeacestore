"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

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
        {/* Header */}
        <h2 className="text-2xl font-semibold mb-3 text-center text-[var(--accent)]">
          🌿 Join the Pages & Peace Chapters Club
        </h2>
        <p className="text-sm mb-6 text-center text-[var(--foreground)]/80 leading-relaxed">
          Earn points with every coffee or book — and help us shape the
          experience as an early adopter.
        </p>
        <ul className="text-sm text-[var(--foreground)]/80 space-y-1.5 mb-6 list-disc pl-6">
          <li>Earn rewards with every purchase</li>
          <li>Member-only perks and offers</li>
          <li>Be part of your local Chapter community</li>
        </ul>
        <p className="text-xs text-[var(--foreground)]/60 mb-4 text-center">
          Heads up: we’re still rolling out features — joining now makes you
          part of our founding group.
        </p>

        {/* Checkboxes */}
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
            <span>I consent to receive news and offers from Pages & Peace.</span>
          </label>
        </div>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        {/* Actions */}
<div className="mt-8 flex flex-col sm:flex-row gap-3">
  {/* Cancel: transparent, GREEN text+border by default → GOLD on hover */}
  <Button
    variant="outline"
    onClick={onClose}
    className="
      border-[var(--accent)] text-[var(--accent)]
      hover:bg-transparent
      hover:border-[var(--secondary)] hover:text-[var(--secondary)]
      focus:ring-[var(--secondary)]/40
    "
  >
    Cancel
  </Button>

  {/* Join: green fill → GOLD fill on hover */}
  <Button
    variant="primary"
    onClick={handleJoin}
    disabled={submitting}
    className="
      border-[var(--secondary)]
      hover:bg-[var(--secondary)]
      hover:text-[var(--background)]
      focus:ring-[var(--secondary)]/40
    "
  >
    {submitting ? "Joining..." : "Join the Club"}
  </Button>
</div>


      </div>
    </div>
  );
}
