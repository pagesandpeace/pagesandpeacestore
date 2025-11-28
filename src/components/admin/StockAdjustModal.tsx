"use client";

import { useState } from "react";

export default function StockAdjustModal({ productId, currentStock, onClose }: {
  productId: string;
  currentStock: number;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [value, setValue] = useState<number>(0);
  const [reason, setReason] = useState("Delivery received");
  const [otherReason, setOtherReason] = useState("");

  const computedNewStock =
    mode === "add"
      ? currentStock + value
      : mode === "remove"
        ? currentStock - value
        : value;

  const finalReason = reason === "Other" ? otherReason : reason;

  async function submit() {
    const change =
  mode === "add"
    ? value
    : mode === "remove"
      ? -value
      : value - currentStock;


    const res = await fetch("/api/admin/products/stock/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        change,
        reason: finalReason,
      }),
    });

    if (res.ok) {
      onClose();
      window.location.reload();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[380px] space-y-4">

        <h2 className="text-xl font-semibold">Adjust Stock</h2>

        {/* Mode buttons */}
        <div className="flex gap-2">
          <button
            className={`flex-1 py-2 rounded ${mode === "add" ? "bg-accent text-white" : "bg-gray-100"}`}
            onClick={() => setMode("add")}
          >
            Add Stock
          </button>
          <button
            className={`flex-1 py-2 rounded ${mode === "remove" ? "bg-accent text-white" : "bg-gray-100"}`}
            onClick={() => setMode("remove")}
          >
            Remove Stock
          </button>
          <button
            className={`flex-1 py-2 rounded ${mode === "set" ? "bg-accent text-white" : "bg-gray-100"}`}
            onClick={() => setMode("set")}
          >
            Set Total
          </button>
        </div>

        {/* Value input */}
        <div>
          <label className="font-semibold block mb-1">
            {mode === "add" && "Quantity to Add"}
            {mode === "remove" && "Quantity to Remove"}
            {mode === "set" && "New Inventory Total"}
          </label>

          <input
            type="number"
            min={0}
            className="border rounded px-3 py-2 w-full"
            value={value}
            onChange={e => setValue(Number(e.target.value))}
          />
        </div>

        {/* Preview */}
        <div className="text-sm bg-gray-50 p-2 rounded">
          <p>Current stock: <b>{currentStock}</b></p>
          <p>New stock: <b>{computedNewStock}</b></p>
        </div>

        {/* Reason */}
        <div>
          <label className="font-semibold block mb-1">Reason</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={reason}
            onChange={e => setReason(e.target.value)}
          >
            <option>Delivery received</option>
            <option>Manual correction</option>
            <option>Damaged / write-off</option>
            <option>Missing stock</option>
            <option>Sold offline</option>
            <option>Theft / loss</option>
            <option>Other</option>
          </select>

          {reason === "Other" && (
            <input
              type="text"
              placeholder="Enter reason…"
              className="border rounded px-3 py-2 w-full mt-2"
              value={otherReason}
              onChange={e => setOtherReason(e.target.value)}
            />
          )}
        </div>

        <button
          onClick={submit}
          className="bg-accent text-white w-full py-2 rounded-lg font-semibold"
        >
          Save
        </button>

        <button
          onClick={onClose}
          className="text-neutral-500 underline w-full text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
