"use client";

import { Badge } from "@/components/ui/Badge";
import type {
  SupplierOrderGroup,
  LineItem,
  CustomerGroup,
} from "../types";

type Props = {
  group: SupplierOrderGroup;
  selected: Set<string>;
  onToggle: (id: string) => void;
};

export default function DeliveredTable({
  group,
  selected,
  onToggle,
}: Props) {
  /* ---------------------------------------------
     DERIVE DELIVERED ITEMS (PARTIAL OK)
  --------------------------------------------- */

  type DeliveredRow = LineItem & {
    customer: CustomerGroup;
  };

  const deliveredItems: DeliveredRow[] = group.customers.flatMap(
    (c) =>
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

  if (deliveredItems.length === 0) {
    return null;
  }

  const allIds = deliveredItems.map(
    (i) => i.backorder_id
  );

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

          const paymentStatus =
            item.customer.payment_status ?? "unpaid";

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
                {item.customer.customer_name}
                {item.customer.customer_email && (
                  <div className="text-xs text-gray-500">
                    {item.customer.customer_email}
                  </div>
                )}
              </td>

              {/* READ-ONLY PAYMENT STATUS */}
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
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
