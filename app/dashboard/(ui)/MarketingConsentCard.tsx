"use client";

import { useState } from "react";

export default function MarketingConsentCard() {
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (dismissed) return null;

  async function acceptMarketing() {
    if (saving) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/user/marketing-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error("Unable to save marketing consent");
      }

      setDismissed(true);
    } catch {
      setError("We could not save your choice just now. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-10 rounded-2xl border border-[#D6C28B] bg-[#fffaf2] p-6 shadow-sm" aria-labelledby="marketing-consent-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6642]">Stay in the loop</p>
          <h2 id="marketing-consent-title" className="text-xl font-semibold text-[#111]">Would you like Pages &amp; Peace updates?</h2>
          <p className="mt-2 text-sm leading-6 text-[#555]">
            Get occasional emails about upcoming events, books and café news. You can unsubscribe at any time.
          </p>
          {error ? <p className="mt-2 text-sm font-medium text-red-700" role="alert">{error}</p> : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <button
            type="button"
            onClick={acceptMarketing}
            disabled={saving}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Yes, keep me updated"}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            disabled={saving}
            className="px-3 py-1 text-sm text-[#666] underline underline-offset-2 disabled:opacity-60"
          >
            Not now
          </button>
        </div>
      </div>
    </section>
  );
}
