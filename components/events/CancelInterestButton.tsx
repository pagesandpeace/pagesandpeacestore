"use client";

import { useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";

export default function CancelInterestButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  async function handleCancel() {
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

    const r = await fetch("/api/events/cancel-interest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventId }),
    });

    if (r.ok) {
      window.location.reload();
    } else {
      alert("Failed to cancel interest");
    }

    setLoading(false);
  }

  return (
    <>
      <button
        onClick={handleCancel}
        disabled={loading}
        className="w-full bg-neutral-200 text-neutral-700 py-2 rounded-lg text-sm"
      >
        {loading ? "Cancelling..." : "Cancel interest"}
      </button>

      <AuthPromptModal
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
      />
    </>
  );
}