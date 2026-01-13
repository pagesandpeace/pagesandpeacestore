"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";

import CancelRemainingModal from "../CancelRemainingModal";
import type { SupplierOrderGroup } from "../types";

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

            const paymentStatus =
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
                  {c.customer_name}
                  {c.customer_email && (
                    <div className="text-xs text-gray-500">
                      {c.customer_email}
                    </div>
                  )}
                </td>

                {/* ✅ READ-ONLY PAYMENT STATUS */}
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
