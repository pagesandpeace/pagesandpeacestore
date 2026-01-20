"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import type {
  SupplierOrderGroup,
  LineItem,
  CustomerGroup,
  PaymentStatus,
} from "../types";

type Props = {
  group: SupplierOrderGroup;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onRefresh: () => void;
};

type DeliveredRow = LineItem & {
  customer: CustomerGroup;
};

export default function DeliveredTable({
  group,
  selected,
  onToggle,
  onRefresh,
}: Props) {
  /* ---------------------------------------------
     STATE
  --------------------------------------------- */

  const [paymentModal, setPaymentModal] = useState<{
    backorderId: string;
    status: PaymentStatus;
    reference: string;
  } | null>(null);

  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  /* ---------------------------------------------
     DERIVE DELIVERED ITEMS
  --------------------------------------------- */

  const deliveredItems: DeliveredRow[] = group.customers.flatMap((c) =>
    c.items
      .filter((item) => {
        const received = item.received_quantity ?? 0;
        return (
          received > 0 &&
          item.collected_at == null &&
          item.cancelled_at == null
        );
      })
      .map((item) => ({
        ...item,
        customer: c,
      }))
  );

  if (deliveredItems.length === 0) return null;

  /* ---------------------------------------------
     SELECTION (SAFE TO KEEP)
  --------------------------------------------- */

  const allIds = deliveredItems.map((i) => i.backorder_id);

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

    setSavingPayment(true);
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

    setSavingPayment(false);
    setPaymentModal(null);
    onRefresh();
  }

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  return (
    <>
      {/* EXPLANATORY NOTE */}
      <p className="text-sm text-gray-500">
        These items have been delivered from suppliers and are awaiting customer
        collection. Collection is handled from the Operations page.
      </p>

      <table className="w-full text-sm border mt-3">
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
            <th className="border p-2 text-center">Ordered</th>
            <th className="border p-2 text-center">Received</th>
            <th className="border p-2 text-center">Remaining</th>
            <th className="border p-2">Customer</th>
            <th className="border p-2 text-center">Payment</th>
          </tr>
        </thead>

        <tbody>
          {deliveredItems.map((item) => {
            const received = item.received_quantity ?? 0;
            const remaining = Math.max(
              0,
              item.quantity - received
            );

            const paymentStatus: PaymentStatus =
              item.customer.payment_status ?? "unpaid";

            const isPaid = paymentStatus === "paid";

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

                <td className="border p-2 text-center">
                  {item.quantity}
                </td>

                <td className="border p-2 text-center">
                  {received}
                </td>

                <td className="border p-2 text-center">
                  {remaining}
                </td>

                <td className="border p-2">
                  <div className="font-medium">
                    {item.customer.customer_name}
                  </div>

                  {item.customer.customer_email && (
                    <div className="text-xs text-gray-500">
                      {item.customer.customer_email}
                    </div>
                  )}

                  {item.customer.customer_phone && (
                    <div className="text-xs text-gray-500">
                      📞 {item.customer.customer_phone}
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
                        isPaid
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {paymentStatus.replace("_", " ")}
                    </Badge>
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
                disabled={savingPayment}
              >
                {savingPayment ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
