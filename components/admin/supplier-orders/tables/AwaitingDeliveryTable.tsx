"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";

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
      const remaining = Math.max(
        0,
        item.quantity - received
      );

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
            const remaining = Math.max(
              0,
              item.quantity - received
            );

            const isAwaitingDelivery =
              item.ordered_at != null &&
              remaining > 0 &&
              item.cancelled_at == null;

            if (!isAwaitingDelivery) return null;

            const receiveNow =
              receivedNow[item.backorder_id] ?? 0;

            const canReceive =
              receiveNow > 0 && receiveNow <= remaining;

            const paymentStatus =
              customer.payment_status ?? "unpaid";

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
                  {customer.customer_name}
                  {customer.customer_email && (
                    <div className="text-xs text-gray-500">
                      {customer.customer_email}
                    </div>
                  )}
                </td>

                <td className="border p-2 text-center">
                  <Badge
                    className={
                      paymentStatus === "paid"
                        ? "bg-green-100 text-green-700"
                        : paymentStatus === "deposit_taken"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {paymentStatus.replace("_", " ")}
                  </Badge>
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
                  {received > 0 && (
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
