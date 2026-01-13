"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import AddOrderItemModal from "@/components/admin/AddOrderItemModal";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type OrderIntent = "customer" | "stock";

type ExistingLine = {
  id: string;
  kind: "existing";
  product_id: string;
  product_name: string;
  quantity: number;
  notes: string;
};

type NewLine = {
  id: string;
  kind: "new";
  title: string;
  author?: string;
  supplier?: string;
  isbn?: string;
  quantity: number;
  notes: string;
};

type BackorderLine = ExistingLine | NewLine;

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */

function getDefaultOrderDate(): string {
  const today = new Date();
  const day = today.getDay();
  const next = new Date(today);

  if (day === 1 || day === 2) {
    next.setDate(today.getDate() + (3 - day));
  } else if (day === 3 || day === 4) {
    next.setDate(today.getDate() + (8 - day));
  } else {
    next.setDate(today.getDate() + ((8 - day) % 7));
  }

  return next.toISOString().slice(0, 10);
}

/* ---------------------------------------------
   PAGE
--------------------------------------------- */

export default function BackordersPage() {
  const [orderIntent, setOrderIntent] =
    useState<OrderIntent>("customer");

  /* CUSTOMER / SUPPLIER */
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [supplierName, setSupplierName] = useState("");

  /* PAYMENT */
  const [paymentStatus, setPaymentStatus] =
    useState<"paid" | "unpaid">("unpaid");
  const [paymentReference, setPaymentReference] = useState("");

  /* ORDER */
  const [orderDate, setOrderDate] = useState(getDefaultOrderDate());
  const [lines, setLines] = useState<BackorderLine[]>([]);

  /* UI */
  const [showAddItem, setShowAddItem] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ---------------------------------------------
     LINE HELPERS
  --------------------------------------------- */

  function updateLine(
    id: string,
    updater: (line: BackorderLine) => BackorderLine
  ) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? updater(l) : l))
    );
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  /* ---------------------------------------------
     SUBMIT
  --------------------------------------------- */

  async function submitBackorder() {
    if (orderIntent === "customer") {
      if (!customerName || !customerEmail) {
        setError("Customer name and email are required");
        return;
      }

      if (paymentStatus === "paid" && !paymentReference) {
        setError("Payment reference is required");
        return;
      }
    }

    if (orderIntent === "stock") {
      if (!supplierName.trim()) {
        setError("Supplier name is required for stock orders");
        return;
      }
    }

    if (lines.length === 0) {
      setError("Add at least one item");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/backorders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  order_intent: orderIntent,
  order_date: orderDate,

  supplier_name:
    orderIntent === "stock" ? supplierName : undefined,

  customer:
    orderIntent === "customer"
      ? {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        }
      : undefined,

  payment_status:
    orderIntent === "customer" ? paymentStatus : undefined,

  payment_reference:
    orderIntent === "customer" && paymentStatus === "paid"
      ? paymentReference
      : undefined,

  items: lines.map((l) =>
    l.kind === "existing"
      ? {
          kind: "existing",
          product_id: l.product_id,
          quantity: l.quantity,
          notes: l.notes,
        }
      : {
          kind: "new",
          title: l.title,
          author: l.author,
          supplier: l.supplier,
          isbn: l.isbn,
          quantity: l.quantity,
          notes: l.notes,
        }
  ),
})
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      // reset
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setSupplierName("");
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
      <h1 className="text-3xl font-bold">Backorders</h1>

      {/* ORDER INTENT */}
      <div className="flex gap-2">
        <Button
          variant={orderIntent === "customer" ? "primary" : "neutral"}
          onClick={() => setOrderIntent("customer")}
        >
          Customer request
        </Button>
        <Button
          variant={orderIntent === "stock" ? "primary" : "neutral"}
          onClick={() => setOrderIntent("stock")}
        >
          Stock order
        </Button>
      </div>

      {/* CUSTOMER */}
      {orderIntent === "customer" && (
        <div className="border rounded-lg p-4 bg-white space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <Input
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
      )}

      {/* SUPPLIER */}
      {orderIntent === "stock" && (
        <div className="border rounded-lg p-4 bg-white">
          <Input
            placeholder="Supplier name"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />
        </div>
      )}

      {/* ORDER DATE */}
      <Input
        type="date"
        value={orderDate}
        onChange={(e) => setOrderDate(e.target.value)}
      />

      {/* ADD ITEM */}
      <Button onClick={() => setShowAddItem(true)}>
        + Add order item
      </Button>

      {/* LINES */}
      {lines.map((line) => (
        <div
          key={line.id}
          className="border p-4 rounded bg-white space-y-2"
        >
          <div className="flex justify-between">
            <p className="font-medium">
              {line.kind === "existing"
                ? line.product_name
                : line.title}
            </p>

            <Button
              variant="ghost"
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
                updateLine(line.id, (l) => ({
                  ...l,
                  quantity: Number(e.target.value),
                }))
              }
            />

            <Input
              placeholder="Notes"
              value={line.notes}
              onChange={(e) =>
                updateLine(line.id, (l) => ({
                  ...l,
                  notes: e.target.value,
                }))
              }
            />
          </div>
        </div>
      ))}

      {error && <Alert type="error" message={error} />}
{/* PAYMENT (CUSTOMER ONLY) */}
{orderIntent === "customer" && lines.length > 0 && (
  <div className="border rounded-lg p-4 bg-white space-y-3">
    <h3 className="font-medium">Payment</h3>

    <div className="flex gap-2">
      <Button
        variant={paymentStatus === "unpaid" ? "primary" : "neutral"}
        onClick={() => setPaymentStatus("unpaid")}
      >
        Unpaid
      </Button>

      <Button
        variant={paymentStatus === "paid" ? "primary" : "neutral"}
        onClick={() => setPaymentStatus("paid")}
      >
        Paid
      </Button>
    </div>

    {paymentStatus === "paid" && (
      <Input
        placeholder="Payment reference (receipt, till, Stripe, etc.)"
        value={paymentReference}
        onChange={(e) => setPaymentReference(e.target.value)}
      />
    )}
  </div>
)}

      {lines.length > 0 && (
        <Button onClick={submitBackorder} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit backorder"}
        </Button>
      )}

      

      {/* MODAL */}
      <AddOrderItemModal
        open={showAddItem}
        onClose={() => setShowAddItem(false)}
        onAdd={(item) => {
          if (item.kind === "existing") {
            const line: ExistingLine = {
              id: crypto.randomUUID(),
              kind: "existing",
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              notes: item.notes ?? "",
            };
            setLines((prev) => [line, ...prev]);
          } else {
            const line: NewLine = {
              id: crypto.randomUUID(),
              kind: "new",
              title: item.title,
              author: item.author,
              supplier: item.supplier,
              isbn: item.isbn,
              quantity: item.quantity,
              notes: item.notes ?? "",
            };
            setLines((prev) => [line, ...prev]);
          }
        }}
      />
    </div>
  );
}
