"use client";

import { useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";
import { Button } from "@/components/ui/Button";

export default function AttendButton({
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

    const r = await fetch("/api/events/attend", {
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
      <Button onClick={handleClick} disabled={loading} className="w-full">
        {loading ? "Saving…" : "Attend event"}
      </Button>

      <AuthPromptModal
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
      />
    </>
  );
}