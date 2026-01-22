import { createClient } from "@supabase/supabase-js";
import FoodReconciliationTable from "@/components/admin/food/FoodReconciliationTable";
import type {
  GroupedRow,
  NormalisedRow,
  RowStatus,
} from "@/types/food-reconciliation";

/* ======================================================
   CONFIG
====================================================== */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const PAGE_SIZE = 50;

type StatusTab = "unclassified" | "classified" | "ignored" | "all";

/* ======================================================
   TYPES
====================================================== */

type SalesEventRow = {
  id: string;
  raw_name: string;
  quantity: number;
  gross_amount_pence: number | null;
  sale_day: string | null;
  created_at: string;
  sales_classifications: {
    category: string | null;
    ignored: boolean;
  }[] | null;
};

/* ======================================================
   HELPERS
====================================================== */

function normaliseAndGroup(rows: SalesEventRow[]): GroupedRow[] {
  const map = new Map<string, NormalisedRow[]>();

  for (const row of rows) {
    let status: RowStatus = "unclassified";

    if (row.sales_classifications && row.sales_classifications.length > 0) {
      status = row.sales_classifications.some((c) => c.ignored)
        ? "ignored"
        : "classified";
    }

    const unit_price =
      row.gross_amount_pence !== null && row.quantity > 0
        ? row.gross_amount_pence / 100 / row.quantity
        : null;

    const normalised: NormalisedRow = {
      id: row.id,
      raw_name: row.raw_name,
      quantity: row.quantity,
      status,
      category: row.sales_classifications?.[0]?.category ?? null,
      unit_price,
      sale_day: row.sale_day,
      created_at: row.created_at,
    };

    if (!map.has(row.raw_name)) {
      map.set(row.raw_name, []);
    }

    map.get(row.raw_name)!.push(normalised);
  }

  return Array.from(map.entries()).map(([raw_name, rows]) => ({
    raw_name,
    rows,
    eventCount: rows.length,
    unitCount: rows.reduce((sum, r) => sum + r.quantity, 0),
  }));
}

/* ======================================================
   PAGE
====================================================== */

export default async function FoodReconciliationPage(props: {
  searchParams?: Promise<{
    status?: StatusTab;
    page?: string;
  }>;
}) {
  const searchParams = (await props.searchParams) ?? {};

  const status: StatusTab = searchParams.status ?? "unclassified";
  const page = Math.max(Number(searchParams.page ?? "1"), 1);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  /* --------------------------------------------------
     COUNTS
  -------------------------------------------------- */

  const { data: countsRows } =
    await supabase.rpc("get_sales_reconciliation_counts");

  const counts = countsRows?.[0];

  /* --------------------------------------------------
     FILTER
  -------------------------------------------------- */

  let whereClause = "true";

  if (status === "unclassified") {
    whereClause = "sc.sales_event_id is null";
  } else if (status === "classified") {
    whereClause = "sc.sales_event_id is not null and sc.ignored = false";
  } else if (status === "ignored") {
    whereClause = "sc.ignored = true";
  }

  /* --------------------------------------------------
     IDS + PAGING
  -------------------------------------------------- */

  const { data: ids } = await supabase.rpc("filtered_sales_ids", {
    where_clause: whereClause,
  });

  const pageIds = (ids ?? []).slice(from, to + 1);

  /* --------------------------------------------------
     DATA FETCH (REAL SCHEMA)
  -------------------------------------------------- */

  const { data: rows, error } = await supabase
    .from("sales_events")
    .select(
      `
      id,
      raw_name,
      quantity,
      gross_amount_pence,
      sale_day,
      created_at,
      sales_classifications (
        category,
        ignored
      )
    `
    )
    .in("id", pageIds)
    .order("sale_day", { ascending: true });

  if (error) {
    console.error("❌ sales_events query failed:", error);
  }

  const grouped = normaliseAndGroup((rows ?? []) as SalesEventRow[]);

  const totalForTab =
    status === "unclassified"
      ? counts.unclassified
      : status === "classified"
      ? counts.classified
      : status === "ignored"
      ? counts.ignored
      : counts.total;

  const totalPages = Math.max(1, Math.ceil(totalForTab / PAGE_SIZE));

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <h1 className="text-xl font-semibold">Sales Reconciliation</h1>

      <p className="text-sm text-muted-foreground">
        Viewing <strong>{status}</strong> sales
      </p>

      <div className="flex gap-4 text-sm">
        <Tab label="Unclassified" count={counts.unclassified} status="unclassified" />
        <Tab label="Classified" count={counts.classified} status="classified" />
        <Tab label="Ignored" count={counts.ignored} status="ignored" />
        <Tab label="All" count={counts.total} status="all" />
      </div>

      <FoodReconciliationTable grouped={grouped} />

      {/* Pagination */}
      <div className="flex items-center gap-4 text-sm">
        {page > 1 && (
          <a
            href={`/admin/food/reconciliation?status=${status}&page=${page - 1}`}
            className="underline"
          >
            ← Previous
          </a>
        )}

        <span>
          Page {page} of {totalPages}
        </span>

        {page < totalPages && (
          <a
            href={`/admin/food/reconciliation?status=${status}&page=${page + 1}`}
            className="underline"
          >
            Next →
          </a>
        )}
      </div>
    </div>
  );
}

/* ======================================================
   TAB LINK
====================================================== */

function Tab({
  label,
  count,
  status,
}: {
  label: string;
  count: number;
  status: StatusTab;
}) {
  return (
    <a
      href={`/admin/food/reconciliation?status=${status}&page=1`}
      className="underline"
    >
      {label} ({count})
    </a>
  );
}
