"use client";

import { useState } from "react";

export default function BookNowButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    setLoading(true);

    const res = await fetch("/api/events/book", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventId }),
    });

    const data = await res.json();

    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <button
      onClick={handleBook}
      disabled={loading}
      className="
        bg-[#5DA865] hover:bg-[#4c8a55]
        text-white px-8 py-3 rounded-lg font-semibold
        transition-colors duration-200
      "
    >
      {loading ? "Redirecting…" : "Book Now"}
    </button>
  );
}
