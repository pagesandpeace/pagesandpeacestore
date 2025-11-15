"use client";

import { useState, useTransition } from "react";

export default function BookNowButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const handleBook = () => {
    if (isPending) return;

    setLoading(true);

    startTransition(async () => {
      const res = await fetch("/api/events/start-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventId }),
      });

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url;
      } else {
        window.location.href = `/events/${eventId}?error=checkout`;
      }

      setLoading(false);
    });
  };

  return (
    <button
      onClick={handleBook}
      disabled={isPending || loading}
      className="
        bg-[#5DA865] hover:bg-[#4c8a55]
        text-white px-8 py-3 rounded-lg font-semibold
        transition-colors duration-200
      "
    >
      {isPending || loading ? "Redirecting…" : "Book Now"}
    </button>
  );
}
