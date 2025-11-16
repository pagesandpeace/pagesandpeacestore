"use client";

import { Button } from "@/components/ui/Button";

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const handleCancel = async () => {
    const confirmCancel = confirm("Are you sure you want to cancel this booking?");
    if (!confirmCancel) return;

    const res = await fetch("/api/admin/events/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Unable to cancel booking.");
      return;
    }

    if (data.status === "too_late") {
      alert("This event starts in under 48 hours. Please contact us to cancel.");
      return;
    }

    if (data.status === "refunded") {
      alert("Booking cancelled. A refund has been issued.");
    } else if (data.status === "cancelled_no_refund") {
      alert("Booking cancelled. No refund due to late cancellation.");
    }

    window.location.reload();
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
