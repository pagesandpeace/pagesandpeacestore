import { createClient } from "@supabase/supabase-js";
import ApplySalesButton from "@/components/admin/food/ApplySalesButton";
import FoodReconciliationTable from "@/components/admin/food/FoodReconciliationTable";

/* ======================================================
   SERVER CONFIG
====================================================== */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* ======================================================
   TYPES
====================================================== */

type RowStatus = "unclassified" | "classified" | "ignored";

export type NormalisedRow = {
  id: string;
  raw_name: string;
  quantity: number;
  status: RowStatus;
  category: string | null;
};

export type GroupedRow = {
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

/* ======================================================
   SERVER PAGE
====================================================== */

export default async function FoodReconciliationPage() {
  /* --------------------------------------------------
     LOAD SALES
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
     FIND FIRST INCOMPLETE DAY
  -------------------------------------------------- */

  let startDay: string | null = null;

  for (const row of typedSales) {
    const c = Array.isArray(row.sales_classifications)
      ? row.sales_classifications[0]
      : row.sales_classifications;

    if (!c || (!c.ignored && !c.category)) {
      startDay = row.sale_day;
      break;
    }
  }

  if (!startDay) {
    return <div className="p-6">🎉 All sales are fully reconciled.</div>;
  }

  /* --------------------------------------------------
     BATCH WINDOW (7 DAYS)
  -------------------------------------------------- */

  const start = new Date(startDay);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endDay = end.toISOString().slice(0, 10);

  const batch = typedSales.filter(
    (r) => r.sale_day >= startDay! && r.sale_day <= endDay
  );

  /* --------------------------------------------------
     NORMALISE
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
     GROUP BY RAW NAME
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
     READY TO APPLY
  -------------------------------------------------- */

  const readyToApply = rows.filter(
    (r) =>
      r.status === "classified" &&
      ["food", "drink", "book", "merch"].includes(r.category ?? "")
  );

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <h1 className="text-xl font-semibold">Reconciliation queue</h1>

      <div className="text-sm text-muted-foreground">
        Showing sales from <strong>{startDay}</strong> →{" "}
        <strong>{endDay}</strong>
      </div>

      {readyToApply.length > 0 && (
        <ApplySalesButton
          fromDay={startDay}
          toDay={endDay}
          disabled={readyToApply.length === 0}
        />
      )}

      <FoodReconciliationTable grouped={grouped} />
    </div>
  );
}
