"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function CancelInterestButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);

    const res = await fetch("/api/events/cancel-interest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventId }),
    });

    if (res.ok) {
      window.location.reload();
    } else {
      alert("Failed to cancel interest");
    }

    setLoading(false);
  }

  return (
    <Button
      onClick={handleCancel}
      disabled={loading}
      variant="neutral"
      size="sm"
      className="w-full"
    >
      {loading ? "Cancelling..." : "Cancel interest"}
    </Button>
  );
}