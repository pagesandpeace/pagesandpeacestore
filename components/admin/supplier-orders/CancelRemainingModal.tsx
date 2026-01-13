"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  backorderId: string | null;
  remaining: number;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CancelRemainingModal({
  open,
  backorderId,
  remaining,
  onClose,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !backorderId) return null;

  async function submit() {
    if (reason.trim().length < 3) {
      setError("Please provide a short reason.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await fetch(
      "/api/admin/backorders/cancel-remaining",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: backorderId,
          reason,
        }),
      }
    );

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Failed to cancel remaining");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setReason("");
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-md rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          Cancel remaining quantity
        </h2>

        <p className="text-sm text-gray-600">
          Remaining to cancel: <strong>{remaining}</strong>
        </p>

        <textarea
          className="w-full border rounded p-2 text-sm"
          rows={3}
          placeholder="Reason (supplier short, damaged, etc.)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1 text-sm border rounded"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            className="px-3 py-1 text-sm bg-red-600 text-white rounded disabled:opacity-50"
            onClick={submit}
            disabled={submitting}
          >
            Confirm cancel
          </button>
        </div>
      </div>
    </div>
  );
}
