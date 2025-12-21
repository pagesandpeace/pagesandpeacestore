"use client";

import { useToast } from "@/components/ui/useToast";
import { Button } from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const { toast } = useToast();
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function doCancel() {
    try {
      const res = await fetch("/api/admin/events/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Error",
          description: data.error || "Unable to cancel booking.",
          variant: "destructive",
        });
        return;
      }

      if (data.status === "too_late") {
        toast({
          title: "Too Late",
          description: "This event starts in under 48 hours.",
          variant: "destructive",
        });
        return;
      }

      if (data.status === "refunded") {
  toast({
    title: "Booking Cancelled",
    description: "A refund has been issued.",
    variant: "success",
  });
} else {
  toast({
    title: "Booking Cancelled",
    description: "Cancelled with no refund due to late cancellation.",
    variant: "success",
  });
}


      startTransition(() => router.refresh());
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setModalOpen(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="text-red-600"
        onClick={() => setModalOpen(true)}
      >
        Cancel
      </Button>

      <ConfirmModal
        open={modalOpen}
        title="Cancel Booking?"
        message="Are you sure you want to cancel this booking? This action cannot be undone."
        onConfirm={doCancel}
        onCancel={() => setModalOpen(false)}
        loading={isPending}
      />
    </>
  );
}
