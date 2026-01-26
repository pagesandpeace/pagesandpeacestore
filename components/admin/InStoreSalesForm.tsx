"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import AddSaleItemModal, {
  SaleLine,
} from "@/components/admin/AddSaleItemModal";

export default function InStoreSalesForm() {
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);

  const [saleRef, setSaleRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [successOrder, setSuccessOrder] = useState<{
    sale_number: string;
    total: number;
  } | null>(null);

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, l) => sum + l.unit_price * l.quantity,
        0
      ),
    [lines]
  );

  const canSubmit =
    lines.length > 0 &&
    saleRef.trim().length > 0 &&
    !submitting;

  async function submitSale() {
    setSubmitting(true);
    setError(null);
    setSuccessOrder(null);

    try {
      const res = await fetch(
        "/api/admin/pos/orders/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sale_ref: saleRef,
            lines: lines.map((l) => ({
              product_id: l.product_id,
              quantity: l.quantity,
              unit_price: l.unit_price,
            })),
          }),
        }
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();

      setSuccessOrder({
        sale_number: data.sale_number,
        total: data.total,
      });

      // FULL RESET
      setLines([]);
      setSaleRef("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to record sale"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            In-store sales
          </h2>
          <p className="text-sm text-gray-600">
            Record physical sales and adjust inventory
          </p>
        </div>

        <Button onClick={() => setShowAddItem(true)}>
          + Add item
        </Button>
      </div>

      {lines.map((line) => (
        <div
          key={line.id}
          className="border rounded bg-white p-4 space-y-3"
        >
          <div className="flex justify-between">
            <div>
              <p className="font-medium">
                {line.product_name}
              </p>
              <p className="text-xs text-gray-500">
                Product ID: {line.product_id}
              </p>
            </div>

            <Button
              variant="ghost"
              onClick={() =>
                setLines((prev) =>
                  prev.filter((l) => l.id !== line.id)
                )
              }
            >
              Remove
            </Button>
          </div>

          <div className="text-sm">
            Line total: £
            {(line.unit_price * line.quantity).toFixed(
              2
            )}
          </div>
        </div>
      ))}

      {lines.length > 0 && (
        <div className="border rounded bg-white p-4 space-y-2">
          <label className="text-sm font-medium">
            SumUp / external sales reference
          </label>
          <Input
            value={saleRef}
            onChange={(e) =>
              setSaleRef(e.target.value)
            }
          />
        </div>
      )}

      {error && <Alert type="error" message={error} />}

      {successOrder && (
        <div className="border rounded-lg bg-green-50 p-4 space-y-1">
          <div className="font-medium text-green-900">
            Sale recorded successfully
          </div>
          <div className="text-sm text-green-800">
            Internal sale ID:{" "}
            <span className="font-mono">
              {successOrder.sale_number}
            </span>
          </div>
          <div className="text-sm text-green-800">
            Total: £{successOrder.total.toFixed(2)}
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-lg font-semibold">
            Total: £{total.toFixed(2)}
          </div>

          <Button
            variant="neutral"
            disabled={!canSubmit}
            onClick={submitSale}
          >
            {submitting ? "Recording…" : "Record sale"}
          </Button>
        </div>
      )}

      <AddSaleItemModal
        open={showAddItem}
        onClose={() => setShowAddItem(false)}
        onConfirm={(newLines) => {
          setLines((prev) => [...newLines, ...prev]);
          setError(null);
        }}
      />
    </section>
  );
}
