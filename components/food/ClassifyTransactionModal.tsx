"use client";

import { useState } from "react";

type Props = {
  row: {
    id: string; // this is the sales_events.id
    raw_name: string;
    quantity: number;
    amount_pence: number;
  };
};

type Category = "food" | "drink" | "retail" | "other" | "unknown";

export default function ClassifyTransactionModal({ row }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("food");
  const [ignored, setIgnored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/food/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sales_event_id: row.id,
        category,
        product_id: null,
        ignored,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? "Failed to classify");
      setLoading(false);
      return;
    }

    window.location.reload();
  }

  return (
    <>
      <button
        className="text-xs underline text-blue-600"
        onClick={() => setOpen(true)}
      >
        Classify
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded p-4 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-sm">Classify sale</h2>

            <div className="text-xs space-y-1">
              <div>
                <strong>Description:</strong> {row.raw_name}
              </div>
              <div>
                <strong>Qty:</strong> {row.quantity}
              </div>
              <div>
                <strong>Amount:</strong> £{(row.amount_pence / 100).toFixed(2)}
              </div>
            </div>

            <label className="text-xs flex items-center gap-2">
              <input
                type="checkbox"
                checked={ignored}
                onChange={(e) => setIgnored(e.target.checked)}
              />
              Ignore this line (still visible)
            </label>

            <select
              className="border rounded px-2 py-1 w-full text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              disabled={ignored}
            >
              <option value="food">Food</option>
              <option value="drink">Drink</option>
              <option value="retail">Retail</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </select>

            {error && <div className="text-xs text-red-600">{error}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <button className="text-xs" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={handleSave}
                className="text-xs bg-black text-white px-3 py-1 rounded"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
