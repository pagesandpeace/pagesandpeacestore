"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type RefundReason =
  | "customer_requested_cancellation"
  | "duplicate_booking"
  | "admin_error"
  | "event_cancelled"
  | "goodwill"
  | "other";

const REFUND_REASON_OPTIONS: { value: RefundReason; label: string }[] = [
  {
    value: "customer_requested_cancellation",
    label: "Customer requested cancellation",
  },
  { value: "duplicate_booking", label: "Duplicate booking" },
  { value: "admin_error", label: "Admin error" },
  { value: "event_cancelled", label: "Event cancelled" },
  { value: "goodwill", label: "Goodwill" },
  { value: "other", label: "Other" },
];

export default function RefundOrderButton({
  orderId,
  refundable,
}: {
  orderId: string;
  refundable: number;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] =
    useState<RefundReason>("customer_requested_cancellation");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setOpen(true);
    setReason("customer_requested_cancellation");
    setNotes("");
    setError(null);
  }

  function closeModal() {
    if (submitting) return;
    setOpen(false);
    setReason("customer_requested_cancellation");
    setNotes("");
    setError(null);
  }

  async function refundAll() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          reason,
          notes: notes.trim() || null,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(data?.error || "Refund failed");
      }

      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund failed");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="text-red-600 border-red-300 hover:bg-red-50"
        onClick={openModal}
      >
        Refund remaining £{refundable.toFixed(2)}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-red-700">
                Confirm full order refund
              </h3>
              <p className="mt-1 text-sm text-neutral-600">
                This will send a real refund through Stripe.
              </p>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-lg border bg-neutral-50 p-4 text-sm">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-neutral-500">Order ID</p>
                    <p className="font-medium break-all">{orderId}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Refund amount</p>
                    <p className="font-medium">
                      £{refundable.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="full-refund-reason"
                  className="mb-2 block text-sm font-medium"
                >
                  Refund reason
                </label>
                <select
                  id="full-refund-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as RefundReason)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-neutral-400"
                >
                  {REFUND_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="full-refund-notes"
                  className="mb-2 block text-sm font-medium"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="full-refund-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any internal notes for the refund log"
                  rows={4}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-neutral-400"
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={submitting}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700"
                onClick={refundAll}
                disabled={submitting}
              >
                {submitting
                  ? "Processing..."
                  : `Confirm refund of £${refundable.toFixed(2)}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}