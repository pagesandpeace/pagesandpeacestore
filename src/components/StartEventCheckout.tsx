"use client";

import { useTransition } from "react";

export function StartEventCheckout({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const res = await fetch("/api/events/start-checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        window.location.href = `/dashboard/events/${eventId}?error=checkout`;
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90"
    >
      {isPending ? "Starting Checkout..." : "Proceed to Checkout"}
    </button>
  );
}
