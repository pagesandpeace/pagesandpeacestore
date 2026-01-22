"use client";

import type { GroupedRow } from "@/types/food-reconciliation";

export default function FoodReconciliationDetailsModal({
  group,
  onClose,
}: {
  group: GroupedRow;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-md w-full max-w-3xl p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">
            Details for: {group.raw_name}
          </h2>
          <button onClick={onClose}>✕</button>
        </div>

        <table className="w-full text-sm border">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Date</th>
              <th className="text-right p-2">Qty</th>
              <th className="text-right p-2">Price</th>
            </tr>
          </thead>

          <tbody>
            {group.rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">
                  {r.sale_day ?? r.created_at ?? "-"}
                </td>
                <td className="p-2 text-right">{r.quantity}</td>
                <td className="p-2 text-right">
                  {r.unit_price !== null
                    ? `£${r.unit_price.toFixed(2)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
