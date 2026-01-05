"use client";

import { useState } from "react";
import ProductSearchSelect from "@/components/admin/ProductSearchSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

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

type BackorderLine = {
  id: string;
  product_id: string;
  product_name: string;
  product_type: "book" | "stock";
  supplier: string | null;
  quantity: number;
  notes: string;
};

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */

function getDefaultOrderDate(): string {
  const today = new Date();
  const day = today.getDay();
  const next = new Date(today);

  if (day === 1 || day === 2) {
    next.setDate(today.getDate() + (3 - day)); // Wed
  } else if (day === 3 || day === 4) {
    next.setDate(today.getDate() + (8 - day)); // Next Mon
  } else {
    next.setDate(today.getDate() + ((8 - day) % 7)); // Next Mon
  }

  return next.toISOString().slice(0, 10);
}

/* ---------------------------------------------
   PAGE
--------------------------------------------- */

export default function BackordersPage() {
  /* CUSTOMER */
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  /* PAYMENT */
  const [paymentStatus, setPaymentStatus] =
    useState<"paid" | "unpaid">("unpaid");
  const [paymentReference, setPaymentReference] = useState("");

  /* ORDER */
  const [orderDate, setOrderDate] = useState(getDefaultOrderDate());
  const [lines, setLines] = useState<BackorderLine[]>([]);

  /* STATE */
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ---------------------------------------------
     ADD PRODUCT
  --------------------------------------------- */
  function handleAddProduct(product: ProductResult, quantity: number) {
    setLines((prev) => [
      {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.name,
        product_type: product.product_type === "book" ? "book" : "stock",
        supplier: product.supplier,
        quantity,
        notes: "",
      },
      ...prev,
    ]);
  }

  function updateLine(id: string, patch: Partial<BackorderLine>) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  /* ---------------------------------------------
     SUBMIT
  --------------------------------------------- */
  async function submitBackorder() {
    if (!customerName || !customerEmail) {
      setError("Customer name and email are required");
      return;
    }

    if (paymentStatus === "paid" && !paymentReference) {
      setError("Payment reference is required when paid");
      return;
    }

    if (lines.length === 0) {
      setError("Add at least one product");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/backorders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_date: orderDate,
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
          payment_status: paymentStatus,
          payment_reference:
            paymentStatus === "paid" ? paymentReference : undefined,
          items: lines.map((l) => ({
            product_id: l.product_id,
            quantity: l.quantity,
            notes: l.notes,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setPaymentStatus("unpaid");
      setPaymentReference("");
      setLines([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */
  return (
    <div className="max-w-6xl mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-bold">Customer Backorders</h1>

      {/* CUSTOMER */}
      <div className="border rounded-lg p-4 bg-white space-y-3">
        <h2 className="font-medium">Customer</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <Input
            type="email"
            placeholder="Customer email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
          <Input
            placeholder="Customer phone"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>
      </div>

      {/* ORDER */}
      <div className="border rounded-lg p-4 bg-white space-y-3">
        <h2 className="font-medium">Supplier order to be placed on (Mon & Wed)</h2>
        <Input
          type="date"
          value={orderDate}
          onChange={(e) => setOrderDate(e.target.value)}
        />
      </div>

      {/* PRODUCTS */}
      <div className="border rounded-lg p-4 bg-white space-y-2">
        <label className="text-sm font-medium">Add books</label>
        <ProductSearchSelect onAdd={handleAddProduct} />
      </div>

      {/* LINES */}
      <div className="space-y-4">
        {lines.map((line) => (
          <div
            key={line.id}
            className="border rounded-lg p-4 bg-white space-y-3"
          >
            <div className="flex justify-between">
              <div>
                <p className="font-medium">{line.product_name}</p>
                <p className="text-sm text-gray-500">
                  {line.product_type}
                  {line.supplier ? ` · ${line.supplier}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="neutral"
                onClick={() => removeLine(line.id)}
              >
                Remove
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(e) =>
                  updateLine(line.id, {
                    quantity: Number(e.target.value),
                  })
                }
              />
              <Input
                placeholder="Notes"
                value={line.notes}
                onChange={(e) =>
                  updateLine(line.id, { notes: e.target.value })
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* PAYMENT */}
      <div className="border rounded-lg p-4 bg-white space-y-3">
        <h2 className="font-medium">Payment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            className="border rounded px-3 py-2"
            value={paymentStatus}
            onChange={(e) =>
              setPaymentStatus(
                e.target.value === "paid" ? "paid" : "unpaid"
              )
            }
          >
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>

          {paymentStatus === "paid" && (
            <Input
              placeholder="SumUp payment reference"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
          )}
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* SUBMIT */}
      {lines.length > 0 && (
        <Button onClick={submitBackorder} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit backorder"}
        </Button>
      )}
    </div>
  );
}