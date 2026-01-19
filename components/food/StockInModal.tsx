"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import ProductSearchSelect from "@/components/admin/ProductSearchSelect";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type ProductResult = {
  id: string;
  name: string;
  product_type: string;
  supplier: string | null;
  inventory_count: number;
};

type StockLine = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
};

type Props = {
  onClose: () => void;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */

export default function StockInModal({ onClose }: Props) {
  /* header */
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<string>("");

  /* entry row */
  const [entryProduct, setEntryProduct] = useState<ProductResult | null>(null);
  const [entryQty, setEntryQty] = useState(1);
  const [entryCost, setEntryCost] = useState(0);

  /* added lines */
  const [lines, setLines] = useState<StockLine[]>([]);

  /* ui state */
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /* ---------------------------------------------
     ADD LINE
  --------------------------------------------- */

  function addLine() {
    if (!entryProduct) {
      setError("Select a product before adding.");
      return;
    }
    if (entryQty <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }
    if (entryCost < 0) {
      setError("Unit cost cannot be negative.");
      return;
    }

    setLines((prev) => [
      ...prev,
      {
        id: uid(),
        product_id: entryProduct.id,
        product_name: entryProduct.name,
        quantity: entryQty,
        unit_cost: entryCost,
      },
    ]);

    setEntryProduct(null);
    setEntryQty(1);
    setEntryCost(0);
    setError(null);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  /* ---------------------------------------------
     SUBMIT
  --------------------------------------------- */

  async function submit() {
    setError(null);

    if (!supplierName.trim()) {
      setError("Supplier name is required.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one stock line.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/admin/food/stock/in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_name: supplierName.trim(),
          invoice_number: invoiceNumber || null,
          invoice_date: invoiceDate || null,
          items: lines.map((l) => ({
            product_id: l.product_id,
            quantity: l.quantity,
            unit_cost: l.unit_cost,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
      setLines([]);
      setInvoiceNumber("");
      setInvoiceDate("");
    } catch (e: any) {
      setError(e.message || "Failed to record stock");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------
     PREVIEW
  --------------------------------------------- */

  const previewTotalUnits = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines]
  );

  const previewTotalCost = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * l.unit_cost, 0),
    [lines]
  );

  /* ---------------------------------------------
     UI
  --------------------------------------------- */

  return (
    <Modal onClose={onClose}>
      <div className="space-y-6 max-w-3xl">
        <h2 className="text-xl font-semibold">Stock In</h2>

        {/* HEADER */}
        <div className="rounded border p-4 bg-gray-50 space-y-3">
          <input
            className="border rounded px-2 py-1 w-full"
            placeholder="Supplier (e.g. Mercadona)"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />

          <input
            className="border rounded px-2 py-1 w-full"
            placeholder="Invoice number (optional)"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />

          <input
            type="date"
            className="border rounded px-2 py-1 w-full"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
        </div>

        {/* ENTRY */}
        <div className="rounded border p-4 space-y-3">
          {!entryProduct ? (
            <ProductSearchSelect onAdd={setEntryProduct} />
          ) : (
            <button
              onClick={() => setEntryProduct(null)}
              className="w-full text-left border rounded px-2 py-1 bg-white"
            >
              {entryProduct.name}
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={1}
              className="border rounded px-2 py-1"
              value={entryQty}
              onChange={(e) => setEntryQty(Number(e.target.value))}
            />

            <input
              type="number"
              min={0}
              step="0.01"
              className="border rounded px-2 py-1"
              value={entryCost}
              onChange={(e) => setEntryCost(Number(e.target.value))}
            />
          </div>

          <Button variant="outline" onClick={addLine}>
            + Add line
          </Button>
        </div>

        {/* LINES */}
        {lines.length > 0 && (
          <div className="rounded border p-4 space-y-2">
            {lines.map((l) => (
              <div
                key={l.id}
                className="flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{l.product_name}</div>
                  <div className="text-xs text-gray-600">
                    {l.quantity} × £{l.unit_cost.toFixed(2)}
                  </div>
                </div>

                <button
                  onClick={() => removeLine(l.id)}
                  className="text-red-600 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* FOOTER */}
        <div className="space-y-3">
          <div className="text-sm">
            {previewTotalUnits} units · £
            {previewTotalCost.toFixed(2)}
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 p-3 border">
              ❌ {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-800 bg-green-50 p-3 border">
              ✅ Stock recorded successfully
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="neutral" onClick={onClose}>
              Close
            </Button>

            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Record stock"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
