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
      setError("Please accept the Loyalty Terms to continue.");
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
        // ✅ Not signed in: redirect to sign-up with loyalty flag
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-[var(--background)] text-[var(--foreground)] rounded-xl p-6 max-w-md w-full shadow-lg text-left">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          🌿 Join the Pages & Peace Loyalty Club
        </h2>
        <p className="text-sm mb-4 text-center text-[var(--foreground)]/80">
          Earn points with every purchase, get special rewards, and exclusive member updates.
        </p>

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
                href="/loyalty-terms"
                target="_blank"
                className="underline text-[var(--accent)]"
              >
                Loyalty Program Terms (v1.0)
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
            <span>I consent to receive marketing communications.</span>
          </label>
        </div>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <div className="mt-6 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm font-medium border border-[var(--foreground)]/30 hover:bg-[var(--foreground)]/10"
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={submitting}
            className="px-5 py-2 rounded-full bg-[var(--accent)] text-[var(--background)] font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Joining..." : "Join Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
