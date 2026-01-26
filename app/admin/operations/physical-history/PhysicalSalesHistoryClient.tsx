"use client";

type SaleRow = {
  id: string;
  sale_number: string;
  total: number;
  notes: string | null;
  created_at: string;
  staff_name: string;
};

type Props = {
  sales: SaleRow[];
};

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */

export default function PhysicalSalesHistoryClient({
  sales,
}: Props) {
  return (
    <div className="px-8 py-10 space-y-6">
      <h1 className="text-3xl font-semibold">
        Physical sales history
      </h1>

      <div className="rounded-xl border border-muted overflow-hidden">
        {sales.length === 0 ? (
          <p className="p-6 text-sm text-foreground/60">
            No physical sales recorded.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-foreground/60 border-b border-muted">
              <tr>
                <th className="px-6 py-4 text-left">
                  Date
                </th>
                <th className="px-6 py-4 text-left">
                  Sale ID
                </th>
                <th className="px-6 py-4 text-left">
                  Reference
                </th>
                <th className="px-6 py-4 text-left">
                  Staff
                </th>
                <th className="px-6 py-4 text-right">
                  Total
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-muted">
              {sales.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-muted/30"
                >
                  <td className="px-6 py-5">
                    {formatDate(s.created_at)}
                  </td>

                  <td className="px-6 py-5 font-mono font-medium">
                    {s.sale_number}
                  </td>

                  <td className="px-6 py-5">
                    {s.notes ?? "—"}
                  </td>

                  <td className="px-6 py-5">
                    {s.staff_name}
                  </td>

                  <td className="px-6 py-5 text-right font-medium">
                    £{s.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
