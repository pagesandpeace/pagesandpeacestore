"use client";

import { Button } from "@/components/ui/Button";

export default function RefundOrderButton({
  orderId,
  refundable,
}: {
  orderId: string;
  refundable: number;
}) {
  async function refundAll() {
    if (!confirm(`Refund £${refundable.toFixed(2)}?`)) return;

    const res = await fetch("/api/admin/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });

    if (!res.ok) {
      alert("Refund failed");
      return;
    }

    window.location.reload();
  }

  return (
    <Button
      variant="outline"
      className="text-red-600 border-red-300"
      onClick={refundAll}
    >
      Refund remaining £{refundable.toFixed(2)}
    </Button>
  );
}
