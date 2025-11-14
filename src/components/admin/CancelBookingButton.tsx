"use client";

import { Button } from "@/components/ui/Button";

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const handleCancel = async () => {
    try {
      const res = await fetch("/api/admin/events/cancel", {
        method: "POST",
        body: JSON.stringify({ bookingId }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert("Failed to cancel booking.");
      }
    } catch {
      alert("Error cancelling booking.");
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-red-600"
      onClick={handleCancel}
    >
      Cancel
    </Button>
  );
}
