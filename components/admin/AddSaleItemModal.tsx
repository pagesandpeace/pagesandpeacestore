"use client";

import { useMemo, useState } from "react";
import ProductSearchSelect from "@/components/admin/ProductSearchSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

export type SaleLine = {
  id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
};

type ProductResult = {
  id: string;
  name: string;
  price?: string | number | null;
  retail_price?: string | number | null;
  retail_price_override?: string | number | null;
  stock?: number; // ✅ used for guard
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (lines: SaleLine[]) => void;
};

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */

export default function AddSaleItemModal({
  open,
  onClose,
  onConfirm,
}: Props) {
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- TOTAL ---------------- */

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, l) => sum + l.unit_price * l.quantity,
        0
      ),
    [lines]
  );

  if (!open) return null;

  /* ---------------- HELPERS ---------------- */

  function resolvePrice(product: ProductResult): number {
    const raw =
      product.retail_price_override ??
      product.retail_price ??
      product.price ??
      0;

    const parsed = Number(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function addProduct(product: ProductResult) {
    // 🔒 STOCK GUARD
    if (product.stock !== undefined && product.stock <= 0) {
      setError("This product is out of stock");
      return;
    }

    const unitPrice = resolvePrice(product);
    setError(null);

    setLines((prev) => {
      const existing = prev.find(
        (l) => l.product_id === product.id
      );

      if (existing) {
        return prev.map((l) =>
          l.product_id === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l
        );
      }

      return [
        {
          id: crypto.randomUUID(),
          product_id: product.id,
          product_name: product.name,
          unit_price: unitPrice,
          quantity: 1,
        },
        ...prev,
      ];
    });
  }

  function updateLine(
    id: string,
    updater: (l: SaleLine) => SaleLine
  ) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? updater(l) : l))
    );
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  /* ---------------- RESET HANDLERS ---------------- */

  function handleCancel() {
    setLines([]);
    setError(null);
    onClose();
  }

  function handleConfirm() {
    onConfirm(lines);
    setLines([]);
    setError(null);
    onClose();
  }

  /* ---------------- RENDER ---------------- */

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold">
          New in-store sale
        </h2>

        <ProductSearchSelect
          onAdd={(product) =>
            addProduct(product as ProductResult)
          }
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {lines.length > 0 && (
          <div className="space-y-3">
            {lines.map((line) => (
              <div
                key={line.id}
                className="grid grid-cols-12 gap-3 items-center border rounded p-3"
              >
                <div className="col-span-4 text-sm font-medium">
                  {line.product_name}
                </div>

                <Input
                  className="col-span-2"
                  type="number"
                  step="0.01"
                  min={0}
                  value={line.unit_price}
                  onChange={(e) =>
                    updateLine(line.id, (l) => ({
                      ...l,
                      unit_price:
                        Number(e.target.value) || 0,
                    }))
                  }
                />

                <Input
                  className="col-span-2"
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(line.id, (l) => ({
                      ...l,
                      quantity:
                        Number(e.target.value) || 1,
                    }))
                  }
                />

                <div className="col-span-2 text-sm font-medium">
                  £
                  {(line.unit_price * line.quantity).toFixed(
                    2
                  )}
                </div>

                <Button
                  variant="ghost"
                  className="col-span-2"
                  onClick={() => removeLine(line.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center border-t pt-4">
          <div className="text-lg font-semibold">
            Total: £{total.toFixed(2)}
          </div>

          <div className="flex gap-2">
            <Button
              variant="neutral"
              onClick={handleCancel}
            >
              Cancel
            </Button>

            <Button
              disabled={lines.length === 0}
              onClick={handleConfirm}
            >
              Add to order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
