"use client";

import { useMemo, useState } from "react";
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

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

/* ---------------------------------------------
   PAGE
--------------------------------------------- */

export default function FoodStockInPage() {
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
  const [success, setSuccess] = useState<{
    invoice_id: string;
    rows: number;
  } | null>(null);

  /* quick add product */
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [creatingProduct, setCreatingProduct] = useState(false);

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
    setSuccess(null);

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

      setSuccess({
        invoice_id: data.invoice_id,
        rows: data.rows ?? lines.length,
      });

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
     RENDER
  --------------------------------------------- */

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Food Stock In</h1>

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

      {/* ENTRY ROW */}
      <div className="rounded border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          {/* PRODUCT */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-600">Product</label>
              <button
                type="button"
                onClick={() => setShowNewProduct(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                + New
              </button>
            </div>

            {!entryProduct ? (
              <ProductSearchSelect
                onAdd={(product) => setEntryProduct(product)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEntryProduct(null)}
                className="w-full text-left border rounded px-2 py-1 bg-white hover:bg-gray-50"
              >
                {entryProduct.name}
              </button>
            )}
          </div>

          {/* QTY */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min={1}
              className="border rounded px-2 py-1 w-full"
              value={entryQty}
              onChange={(e) => setEntryQty(Number(e.target.value))}
            />
          </div>

          {/* COST */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Unit price
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="border rounded px-2 py-1 w-full"
              value={entryCost}
              onChange={(e) => setEntryCost(Number(e.target.value))}
            />
          </div>
        </div>

        <button
          onClick={addLine}
          className="rounded border px-3 py-1 text-sm"
        >
          + Add another line
        </button>
      </div>

      {/* ADDED LINES */}
      {lines.length > 0 && (
        <div className="rounded border p-4 space-y-2">
          {lines.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-3 border-b last:border-b-0 py-2"
            >
              <div>
                <div className="font-medium">{l.product_name}</div>
                <div className="text-xs text-gray-600">
                  {l.quantity} × £{l.unit_cost.toFixed(2)}
                </div>
              </div>

              <button
                onClick={() => removeLine(l.id)}
                className="text-sm text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <div className="space-y-3">
        <div className="text-sm text-gray-700">
          Preview: <strong>{previewTotalUnits}</strong> units · £
          <strong>{previewTotalCost.toFixed(2)}</strong>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-300 p-3">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="text-sm text-green-800 bg-green-50 border border-green-300 p-3">
            ✅ Stock received · Invoice ID{" "}
            <span className="font-mono">{success.invoice_id}</span>
          </div>
        )}

        <button
          onClick={submit}
          disabled={saving}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Record stock in"}
        </button>
      </div>

      {/* QUICK ADD PRODUCT MODAL */}
      {showNewProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-4 w-full max-w-sm space-y-3">
            <h2 className="text-sm font-semibold">
              New food product
            </h2>

            <input
              className="border rounded px-2 py-1 w-full"
              placeholder="Product name (e.g. Flat white)"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              autoFocus
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewProduct(false);
                  setNewProductName("");
                }}
                className="text-sm px-3 py-1 border rounded"
              >
                Cancel
              </button>

              <button
                disabled={creatingProduct || !newProductName.trim()}
                onClick={async () => {
                  setCreatingProduct(true);
                  try {
                    const res = await fetch(
                      "/api/admin/food/products/create",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: newProductName }),
                      }
                    );
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);

                    setEntryProduct({
                      id: data.id,
                      name: data.name,
                      product_type: "food",
                      supplier: null,
                      inventory_count: 0,
                    });

                    setShowNewProduct(false);
                    setNewProductName("");
                  } finally {
                    setCreatingProduct(false);
                  }
                }}
                className="text-sm px-3 py-1 bg-black text-white rounded disabled:opacity-50"
              >
                {creatingProduct ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
