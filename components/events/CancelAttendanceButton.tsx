"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import AuthPromptModal from "@/components/ui/AuthPromptModal";

export default function CancelAttendanceButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const handleCancel = async () => {
    setLoading(true);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setShowAuthPrompt(true);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/events/cancel-attendance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ eventId }),
    });

    if (res.ok) {
      window.location.reload();
    } else {
      alert("Something went wrong");
    }

    setLoading(false);
  };

  return (
    <>
      <button
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