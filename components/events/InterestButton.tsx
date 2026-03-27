"use client";

import { useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";

export default function InterestButton({
  eventId,
  onSuccess,
}: {
  eventId: string;
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  async function handleClick() {
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

    const r = await fetch("/api/events/interest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_id: eventId }),
      credentials: "include",
    });

    if (r.ok) {
      onSuccess?.();
    } else {
      alert("Something went wrong.");
    }

    setLoading(false);
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:opacity-90"
      >
        {loading ? "Saving…" : "Join interest list"}
      </button>

      <AuthPromptModal
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
      />
    </>
  );
}