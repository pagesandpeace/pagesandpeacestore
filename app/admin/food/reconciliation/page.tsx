import { createClient } from "@supabase/supabase-js";
import ApplySalesButton from "@/components/admin/food/ApplySalesButton";
import BulkClassifyModal from "@/components/admin/food/BulkClassifyModal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type RowStatus = "unclassified" | "classified" | "ignored";

type NormalisedRow = {
  id: string;
  raw_name: string;
  quantity: number;
  status: RowStatus;
  category: string | null;
};

type GroupedRow = {
  raw_name: string;
  rows: NormalisedRow[];
  eventCount: number;
  unitCount: number;
};

type SalesClassification = {
  category: string | null;
  ignored: boolean;
};

type RawSalesRow = {
  id: string;
  sale_day: string;
  raw_name: string;
  quantity: number;
  sales_classifications:
    | SalesClassification
    | SalesClassification[]
    | null;
};

function getGroupStatus(group: GroupedRow) {
  const statuses = group.rows.map((r) => r.status);
  if (statuses.every((s) => s === "ignored")) return "ignored";
  if (statuses.every((s) => s === "classified")) return "classified";
  if (statuses.every((s) => s === "unclassified")) return "unclassified";
  return "mixed";
}

export default async function FoodReconciliationPage() {
  /* --------------------------------------------------
     1. LOAD SALES
  -------------------------------------------------- */

  const { data: allSales } = await supabaseAdmin
    .from("sales_events")
    .select(`
      id,
      sale_day,
      raw_name,
      quantity,
      sales_classifications (
        category,
        ignored
      )
    `)
    .order("sale_day", { ascending: true });

  if (!allSales || allSales.length === 0) {
    return <div className="p-6">No sales data.</div>;
  }

  const typedSales = allSales as RawSalesRow[];

  /* --------------------------------------------------
     2. FIND OLDEST INCOMPLETE DAY
  -------------------------------------------------- */

  let startDay: string | null = null;

  for (const row of typedSales) {
    const c = Array.isArray(row.sales_classifications)
      ? row.sales_classifications[0]
      : row.sales_classifications;

    const needsAttention = !c || (!c.ignored && !c.category);

    if (needsAttention) {
      startDay = row.sale_day;
      break;
    }
  }

  if (!startDay) {
    return (
      <div className="p-6">
        🎉 All sales are fully reconciled.
      </div>
    );
  }

  /* --------------------------------------------------
     3. BATCH WINDOW (7 DAYS)
  -------------------------------------------------- */

  const start = new Date(startDay);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endDay = end.toISOString().slice(0, 10);

  const batch = typedSales.filter(
    (r) => r.sale_day >= startDay! && r.sale_day <= endDay
  );

  /* --------------------------------------------------
     4. NORMALISE ROWS
  -------------------------------------------------- */

  const rows: NormalisedRow[] = batch.map((r) => {
    const c = Array.isArray(r.sales_classifications)
      ? r.sales_classifications[0]
      : r.sales_classifications;

    let status: RowStatus = "unclassified";
    if (c?.ignored) status = "ignored";
    else if (c?.category) status = "classified";

    return {
      id: r.id,
      raw_name: r.raw_name,
      quantity: r.quantity,
      status,
      category: c?.category ?? null,
    };
  });

  /* --------------------------------------------------
     5. GROUP BY RAW NAME
  -------------------------------------------------- */

  const grouped: GroupedRow[] = Object.values(
    rows.reduce<Record<string, GroupedRow>>((acc, r) => {
      acc[r.raw_name] ??= {
        raw_name: r.raw_name,
        rows: [],
        eventCount: 0,
        unitCount: 0,
      };

      acc[r.raw_name].rows.push(r);
      acc[r.raw_name].eventCount += 1;
      acc[r.raw_name].unitCount += r.quantity;

      return acc;
    }, {})
  );

  /* --------------------------------------------------
     6. READY TO APPLY
  -------------------------------------------------- */

  const readyToApply = rows.filter(
    (r) =>
      r.status === "classified" &&
      ["food", "drink", "book", "merch"].includes(
        r.category ?? ""
      )
  );

  const counts = {
    unclassified: rows.filter((r) => r.status === "unclassified").length,
    classified: rows.filter((r) => r.status === "classified").length,
    ignored: rows.filter((r) => r.status === "ignored").length,
  };

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <h1 className="text-xl font-semibold">
        Reconciliation queue
      </h1>

      <div className="text-sm text-muted-foreground">
        Showing sales from <strong>{startDay}</strong> →{" "}
        <strong>{endDay}</strong>
      </div>

      <div className="flex gap-4 text-xs">
        <span>🟡 Unclassified: {counts.unclassified}</span>
        <span>✅ Classified: {counts.classified}</span>
        <span>🚫 Ignored: {counts.ignored}</span>
      </div>

      {readyToApply.length > 0 && (
        <div className="border rounded p-4 bg-amber-50 space-y-2">
          <div className="font-semibold text-sm">
            Step 2 · Apply stock movements
          </div>

          <div className="text-xs text-muted-foreground">
            All classified items will now be applied to inventory.
          </div>

          <ApplySalesButton
            fromDay={startDay}
            toDay={endDay}
            disabled={readyToApply.length === 0}
          />
        </div>
      )}

      <table className="w-full border bg-white text-sm rounded">
        <thead className="border-b bg-muted">
          <tr>
            <th className="px-2 py-2 text-left">Description</th>
            <th className="px-2 py-2 text-right">Events</th>
            <th className="px-2 py-2 text-right">Units</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {grouped.map((group) => {
            const status = getGroupStatus(group);
            const hasUnclassified = group.rows.some(
              (r) => r.status === "unclassified"
            );

            return (
              <tr key={group.raw_name} className="border-t">
                <td className="px-2 py-2 font-medium">
                  {group.raw_name}
                  {hasUnclassified && (
                    <span className="ml-2 text-xs text-amber-600">
                      new
                    </span>
                  )}
                </td>

                <td className="px-2 py-2 text-right">
                  {group.eventCount}
                </td>

                <td className="px-2 py-2 text-right">
                  {group.unitCount}
                </td>

                <td className="px-2 py-2">
                  {status === "unclassified" && "🟡 Unclassified"}
                  {status === "classified" &&
                    `✅ Classified (${group.rows[0].category})`}
                  {status === "ignored" && "🚫 Ignored"}
                  {status === "mixed" && "🟠 Mixed"}
                </td>

                <td className="px-2 py-2">
                  {(status === "unclassified" ||
                    status === "mixed") && (
                    <BulkClassifyModal
                      rawName={group.raw_name}
                      salesEventIds={group.rows.map((r) => r.id)}
                      triggerLabel={
                        status === "mixed"
                          ? "Fix classification"
                          : "Classify"
                      }
                      variant={
                        status === "mixed" ? "warning" : "default"
                      }
                    />
                  )}

                  {status === "classified" && (
                    <span className="text-xs text-green-700 font-medium">
                      ✓ Ready for stock
                    </span>
                  )}

                  {status === "ignored" && (
                    <span className="text-xs text-muted-foreground">
                      —
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
