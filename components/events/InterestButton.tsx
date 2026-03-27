"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function InterestButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    const res = await fetch("/api/events/interest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_id: eventId }),
      credentials: "include",
    });

    if (res.ok) {
      window.location.reload();
    } else {
      alert("Something went wrong.");
    }

    setLoading(false);
  }

  return (
    <Button onClick={handleClick} disabled={loading} className="w-full">
      {loading ? "Saving…" : "Join interest list"}
    </Button>
  );
}