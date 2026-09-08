"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  scope: "order" | "order_line";
  orderId: string;
  orderLineId?: string;
  label: string;
  itemName: string;
  amountPence: number;
  disabled?: boolean;
};

export default function AppCoreRefundButton({ scope, orderId, orderLineId, label, itemName, amountPence, disabled }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("customer_requested");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/app-core/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, orderId, orderLineId, reason, notes: notes.trim() || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Refund failed");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" disabled={disabled || amountPence <= 0} onClick={() => setOpen(true)} className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">{label}</button>
    {open ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-red-800">Confirm refund</h2>
        <p className="mt-2 text-sm text-neutral-600">This sends a real refund through Stripe. It cannot be undone from this screen.</p>
        <div className="mt-4 rounded-xl border bg-neutral-50 p-4 text-sm">
          <p><span className="text-neutral-500">Refund:</span> <strong>{itemName}</strong></p>
          <p className="mt-1"><span className="text-neutral-500">Amount:</span> <strong>£{(amountPence / 100).toFixed(2)}</strong></p>
        </div>
        <label className="mt-4 block text-sm font-medium">Reason
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
            <option value="customer_requested">Customer requested</option>
            <option value="event_cancelled">Event cancelled</option>
            <option value="duplicate_booking">Duplicate booking</option>
            <option value="admin_error">Admin error</option>
            <option value="goodwill">Goodwill</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="mt-3 block text-sm font-medium">Notes <span className="font-normal text-neutral-500">(optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-20 w-full rounded-lg border px-3 py-2" />
        </label>
        {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-full border px-4 py-2 text-sm">Cancel</button>
          <button type="button" disabled={busy} onClick={submit} className="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Refunding…" : `Refund £${(amountPence / 100).toFixed(2)}`}</button>
        </div>
      </div>
    </div> : null}
  </>;
}
