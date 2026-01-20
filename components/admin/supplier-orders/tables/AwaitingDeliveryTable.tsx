"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import CancelRemainingModal from "../CancelRemainingModal";
import type {
  SupplierOrderGroup,
  LineItem,
  CustomerGroup,
} from "../types";

type Props = {
  group: SupplierOrderGroup;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onRefresh: () => void;
};

/* ---------------------------------------------
   FLATTENED ROW TYPE
--------------------------------------------- */

type FlattenedItem = LineItem & {
  customer: CustomerGroup;
};

export default function AwaitingDeliveryTable({
  group,
  selected,
  onToggle,
  onRefresh,
}: Props) {
  const [receivedNow, setReceivedNow] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const [cancelModal, setCancelModal] = useState<{
    id: string;
    remaining: number;
  } | null>(null);

  /* ---------------- PAYMENT MODAL STATE ---------------- */

  const [paymentModal, setPaymentModal] = useState<{
    backorderId: string;
    status: "paid" | "unpaid";
    reference: string;
  } | null>(null);

  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  /* ---------------------------------------------
     FLATTEN + DEDUPE BACKORDERS
  --------------------------------------------- */

  const uniqueItems: FlattenedItem[] = Object.values(
    group.customers
      .flatMap((c) =>
        c.items.map((item) => ({
          ...item,
          customer: c,
        }))
      )
      .reduce<Record<string, FlattenedItem>>((acc, row) => {
        acc[row.backorder_id] = row;
        return acc;
      }, {})
  );

  /* ---------------------------------------------
     SELECTABLE IDS
  --------------------------------------------- */

  const allIds = uniqueItems
    .filter((item) => {
      const received = item.received_quantity ?? 0;
      const remaining = Math.max(0, item.quantity - received);

      return (
        item.ordered_at != null &&
        remaining > 0 &&
        item.cancelled_at == null
      );
    })
    .map((i) => i.backorder_id);

  const allSelected =
    allIds.length > 0 &&
    allIds.every((id) => selected.has(id));

  const toggleSelectAll = () => {
    allIds.forEach((id) => onToggle(id));
  };

  /* ---------------------------------------------
     RECEIVE HANDLER
  --------------------------------------------- */

  async function commitReceived(
    backorderId: string,
    qtyNow: number
  ) {
    if (saving === backorderId) return;

    setSaving(backorderId);

    await fetch("/api/admin/backorders/receive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: backorderId,
        received_quantity: qtyNow,
      }),
    });

    setSaving(null);
    setReceivedNow((prev) => ({
      ...prev,
      [backorderId]: 0,
    }));
    onRefresh();
  }

  /* ---------------------------------------------
     SAVE PAYMENT (WITH REFERENCE)
  --------------------------------------------- */

  async function savePayment() {
    if (!paymentModal) return;

    if (
      paymentModal.status === "paid" &&
      !paymentModal.reference.trim()
    ) {
      setPaymentError("SumUp payment reference is required");
      return;
    }

    setPaymentSaving(true);
    setPaymentError(null);

    await fetch("/api/admin/supplier-orders/set-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        backorder_id: paymentModal.backorderId,
        payment_status: paymentModal.status,
        payment_reference:
          paymentModal.status === "paid"
            ? paymentModal.reference.trim()
            : null,
      }),
    });

    setPaymentSaving(false);
    setPaymentModal(null);
    onRefresh();
  }

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  return (
    <>
      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2 text-center w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
            </th>
            <th className="border p-2 text-left">Product</th>
            <th className="border p-2 text-center">Requested</th>
            <th className="border p-2 text-center">Ordered</th>
            <th className="border p-2 text-center">Received</th>
            <th className="border p-2 text-center">Remaining</th>
            <th className="border p-2">Customer</th>
            <th className="border p-2 text-center">Payment</th>
            <th className="border p-2 text-center">Receive now</th>
            <th className="border p-2 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {uniqueItems.map(({ customer, ...item }) => {
            const received = item.received_quantity ?? 0;
            const remaining = Math.max(0, item.quantity - received);

            const isAwaitingDelivery =
              item.ordered_at != null &&
              remaining > 0 &&
              item.cancelled_at == null;

            if (!isAwaitingDelivery) return null;

            const receiveNow =
              receivedNow[item.backorder_id] ?? 0;

            const paymentStatus =
              customer.payment_status ?? "unpaid";

            const canReceive =
              paymentStatus === "paid" &&
              receiveNow > 0 &&
              receiveNow <= remaining;

            return (
              <tr key={item.backorder_id}>
                <td className="border p-2 text-center">
                  <input
                    type="checkbox"
                    checked={selected.has(item.backorder_id)}
                    onChange={() =>
                      onToggle(item.backorder_id)
                    }
                  />
                </td>

                <td className="border p-2">
                  {item.product_name}
                </td>

                <td className="border p-2 text-center text-gray-600">
                  {item.requested_quantity}
                </td>

                <td className="border p-2 text-center">
                  {item.quantity}
                </td>

                <td className="border p-2 text-center">
                  {received} / {item.quantity}
                </td>

                <td className="border p-2 text-center">
                  {remaining}
                </td>

                <td className="border p-2">
                  <div className="font-medium">
                    {customer.customer_name}
                  </div>
                  {customer.customer_email && (
                    <div className="text-xs text-gray-500">
                      {customer.customer_email}
                    </div>
                  )}
                  {customer.customer_phone && (
                    <div className="text-xs text-gray-500">
                      📞 {customer.customer_phone}
                    </div>
                  )}
                </td>

                {/* PAYMENT (OPENS MODAL) */}
                <td className="border p-2 text-center">
                  <button
                    onClick={() =>
                      setPaymentModal({
                        backorderId: item.backorder_id,
                        status: paymentStatus,
                        reference: "",
                      })
                    }
                  >
                    <Badge
                      className={`cursor-pointer hover:opacity-80 ${
                        paymentStatus === "paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {paymentStatus}
                    </Badge>
                  </button>
                </td>

                <td className="border p-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={remaining}
                      value={receiveNow}
                      className="w-20 border rounded px-2 py-1 text-sm"
                      onChange={(e) =>
                        setReceivedNow((prev) => ({
                          ...prev,
                          [item.backorder_id]: Number(
                            e.target.value
                          ),
                        }))
                      }
                    />
                    <button
                      className="px-2 py-1 text-xs bg-black text-white rounded disabled:opacity-40"
                      disabled={
                        saving === item.backorder_id ||
                        !canReceive
                      }
                      onClick={() =>
                        commitReceived(
                          item.backorder_id,
                          receiveNow
                        )
                      }
                    >
                      Accept
                    </button>
                  </div>
                </td>

                <td className="border p-2 text-center">
                  {remaining > 0 && (
  <button
    className="px-2 py-1 text-xs bg-red-600 text-white rounded"
    onClick={() =>
      setCancelModal({
        id: item.backorder_id,
        remaining,
      })
    }
  >
    Cancel remaining
  </button>
)}

                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* PAYMENT MODAL */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-sm p-4 space-y-4">
            <h3 className="text-lg font-semibold">
              Update payment
            </h3>

            <div className="flex gap-2">
              <Button
                variant={
                  paymentModal.status === "unpaid"
                    ? "primary"
                    : "neutral"
                }
                onClick={() =>
                  setPaymentModal((m) =>
                    m ? { ...m, status: "unpaid" } : m
                  )
                }
              >
                Unpaid
              </Button>

              <Button
                variant={
                  paymentModal.status === "paid"
                    ? "primary"
                    : "neutral"
                }
                onClick={() =>
                  setPaymentModal((m) =>
                    m ? { ...m, status: "paid" } : m
                  )
                }
              >
                Paid
              </Button>
            </div>

            {paymentModal.status === "paid" && (
              <Input
                placeholder="SumUp payment reference"
                value={paymentModal.reference}
                onChange={(e) =>
                  setPaymentModal((m) =>
                    m
                      ? { ...m, reference: e.target.value }
                      : m
                  )
                }
              />
            )}

            {paymentError && (
              <div className="text-sm text-red-600">
                {paymentError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="neutral"
                onClick={() => setPaymentModal(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={savePayment}
                disabled={paymentSaving}
              >
                {paymentSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <CancelRemainingModal
        open={!!cancelModal}
        backorderId={cancelModal?.id ?? null}
        remaining={cancelModal?.remaining ?? 0}
        onClose={() => setCancelModal(null)}
        onSuccess={onRefresh}
      />
    </>
  );
}
