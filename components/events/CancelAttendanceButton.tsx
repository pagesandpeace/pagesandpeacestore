"use client";

import { useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";

export default function CancelAttendanceButton({
  eventId,
  onSuccess,
}: {
  eventId: string;
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const handleCancel = async () => {
    setLoading(true);

    // ✅ USE COOKIE AUTH (correct)
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

    const r = await fetch("/api/events/cancel-attendance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventId }),
      credentials: "include", // 🔥 important
    });

    if (r.ok) {
      onSuccess?.();
    } else {
      alert("Something went wrong");
    }

    setLoading(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleCancel}
        disabled={loading}
        className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold"
      >
        {loading ? "Cancelling..." : "Cancel Attendance"}
      </button>

      <AuthPromptModal
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
      />
    </>
  );
}