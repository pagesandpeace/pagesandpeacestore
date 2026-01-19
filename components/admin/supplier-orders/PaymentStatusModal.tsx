"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

type Props = {
  open: boolean;
  backorderId: string | null;
  currentStatus: "paid" | "unpaid";
  currentReference: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function PaymentStatusModal({
  open,
  backorderId,
  currentStatus,
  currentReference,
  onClose,
  onSaved,
}: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [reference, setReference] = useState(currentReference ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !backorderId) return null;

  async function save() {
    if (status === "paid" && !reference.trim()) {
      setError("Payment reference is required for paid orders");
      return;
    }

    setSaving(true);
    setError(null);

    await fetch("/api/admin/supplier-orders/set-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        backorder_id: backorderId,
        payment_status: status,
        payment_reference: status === "paid" ? reference : null,
      }),
    });

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-sm p-4 space-y-4">
        <h3 className="text-lg font-semibold">
          Update payment
        </h3>

        <div className="flex gap-2">
          <button onClick={() => setStatus("unpaid")}>
            <Badge
              className={
                status === "unpaid"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
              }
            >
              unpaid
            </Badge>
          </button>

          <button onClick={() => setStatus("paid")}>
            <Badge
              className={
                status === "paid"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }
            >
              paid
            </Badge>
          </button>
        </div>

        {status === "paid" && (
          <Input
            placeholder="SumUp payment reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        )}

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
