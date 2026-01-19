"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import CancelRemainingModal from "../CancelRemainingModal";
import type {
  SupplierOrderGroup,
  PaymentStatus,
} from "../types";

type Props = {
  group: SupplierOrderGroup;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onRefresh: () => void;
};

export default function ToBeOrderedTable({
  group,
  selected,
  onToggle,
  onRefresh,
}: Props) {
  const [draftQty, setDraftQty] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const [cancelModal, setCancelModal] = useState<{
    id: string;
    remaining: number;
  } | null>(null);

  /* ---------------- PAYMENT MODAL STATE ---------------- */

  const [paymentModal, setPaymentModal] = useState<{
    backorderId: string;
    status: PaymentStatus;
    reference: string;
  } | null>(null);

  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  /* ---------------------------------------------
     FILTER TO "TO BE ORDERED"
  --------------------------------------------- */

  const rows = group.customers.flatMap((c) =>
    c.items
      .filter(
        (item) =>
          item.ordered_at == null &&
          item.cancelled_at == null
      )
      .map((item) => ({ customer: c, item }))
  );

  if (rows.length === 0) {
    return null;
  }

  const allIds = rows.map((r) => r.item.backorder_id);

  const allSelected =
    allIds.length > 0 &&
    allIds.every((id) => selected.has(id));

  const toggleSelectAll = () => {
    allIds.forEach((id) => onToggle(id));
  };

  /* ---------------------------------------------
     SAVE PAYMENT
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
            <th className="border p-2">Customer</th>
            <th className="border p-2 text-center">Payment</th>
            <th className="border p-2 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map(({ customer: c, item }) => {
            const orderedQty = item.quantity;
            const draftOrdered =
              draftQty[item.backorder_id] ?? orderedQty;

            const orderedQtyValid =
              Number.isInteger(draftOrdered) &&
              draftOrdered > 0 &&
              draftOrdered <= item.requested_quantity;

            const paymentStatus: PaymentStatus =
              c.payment_status ?? "unpaid";

            return (
              <tr key={item.backorder_id}>
                <td className="border p-2 text-center">
                  <input
                    type="checkbox"
                    disabled={!orderedQtyValid}
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
                  <input
                    type="number"
                    min={1}
                    max={item.requested_quantity}
                    value={draftOrdered}
                    className={`w-20 border rounded px-2 py-1 text-sm text-center ${
                      orderedQtyValid
                        ? ""
                        : "border-red-500"
                    }`}
                    onChange={(e) =>
                      setDraftQty((prev) => ({
                        ...prev,
                        [item.backorder_id]: Number(
                          e.target.value
                        ),
                      }))
                    }
                    onBlur={async () => {
                      if (!orderedQtyValid) return;

                      setSaving(item.backorder_id);

                      await fetch(
                        "/api/admin/backorders/update-quantity",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type":
                              "application/json",
                          },
                          body: JSON.stringify({
                            id: item.backorder_id,
                            quantity: draftOrdered,
                          }),
                        }
                      );

                      setSaving(null);
                      onRefresh();
                    }}
                  />
                </td>

                <td className="border p-2">
                  <div className="font-medium">
                    {c.customer_name}
                  </div>
                  {c.customer_email && (
                    <div className="text-xs text-gray-500">
                      {c.customer_email}
                    </div>
                  )}
                  {c.customer_phone && (
                    <div className="text-xs text-gray-500">
                      📞 {c.customer_phone}
                    </div>
                  )}
                </td>

                {/* PAYMENT (EDITABLE) */}
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
                  <button
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                    onClick={() =>
                      setCancelModal({
                        id: item.backorder_id,
                        remaining:
                          item.requested_quantity,
                      })
                    }
                  >
                    Cancel
                  </button>
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
                      ? {
                          ...m,
                          reference: e.target.value,
                        }
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
