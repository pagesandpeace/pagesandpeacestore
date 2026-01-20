import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type ApplySalesBody = {
  from_day?: string;
  to_day?: string;
};

type SalesClassification = {
  category: string | null;
  ignored: boolean;
  product_id: string | null;
};

type SalesEventRow = {
  id: string;
  sale_day: string;
  sold_at: string;
  quantity: number;
  sales_classifications:
    | SalesClassification
    | SalesClassification[]
    | null;
};

type ClassifiedRow = {
  sales_event_id: string;
  product_id: string;
  category: string;
  quantity: number;
  sold_at: string;
  sale_day: string;
};

type ProductRow = {
  id: string;
  name: string;
  product_type: string;
  tracks_stock: boolean | null;
};

type StockMovementInsert = {
  product_id: string;
  change: number;
  reason: string;
  occurred_at: string;
  source_sale_day: string;
};

/* ---------------------------------------------
   ROUTE
--------------------------------------------- */

export async function POST(req: Request) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 [APPLY SALES → RECONCILIATION] START");

  try {
    const body: unknown = await req.json();
    const { from_day, to_day } = body as ApplySalesBody;

    console.log("📅 Requested range:", { from_day, to_day });

    if (!from_day || !to_day) {
      return NextResponse.json(
        { error: "Missing from_day / to_day" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       1️⃣ LOAD SALES + CLASSIFICATIONS
    -------------------------------------------------- */

    const { data: rows, error } = await supabaseAdmin

      .from("sales_events")
      .select(`
        id,
        sale_day,
        sold_at,
        quantity,
        sales_classifications (
          category,
          ignored,
          product_id
        )
      `)
      .gte("sale_day", from_day)
      .lte("sale_day", to_day);

    if (error) {
      console.error("❌ Failed to load sales_events", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const salesRows = (rows ?? []) as SalesEventRow[];

    console.log(`📄 Loaded sales_events: ${salesRows.length}`);

    /* --------------------------------------------------
       2️⃣ NORMALISE + RESOLVE CLASSIFICATION (LAST WINS)
    -------------------------------------------------- */

    const classified: ClassifiedRow[] = salesRows.flatMap(
      (r) => {
        const raw = r.sales_classifications;

        const classifications = Array.isArray(raw)
          ? raw
          : raw
          ? [raw]
          : [];

        const valid = classifications.filter(
          (x) => x && !x.ignored && x.product_id
        );

        const c = valid.at(-1);

        if (!c || !c.product_id || !c.category) return [];

        return [
          {
            sales_event_id: r.id,
            product_id: c.product_id,
            category: c.category,
            quantity: r.quantity,
            sold_at: r.sold_at,
            sale_day: r.sale_day,
          },
        ];
      }
    );

    console.log(`🏷️ Classified rows: ${classified.length}`);

    if (classified.length === 0) {
      console.warn("⚠️ No classified rows eligible");
      return NextResponse.json({ success: true, applied: 0 });
    }

    /* --------------------------------------------------
       3️⃣ IDEMPOTENCY CHECK
    -------------------------------------------------- */

    const { data: appliedRows, error: appErr } =
      await supabaseAdmin
        
        .from("sales_stock_applications")
        .select("sales_event_id")
        .in(
          "sales_event_id",
          classified.map((r) => r.sales_event_id)
        );

    if (appErr) {
      console.error(
        "❌ Failed to load existing applications",
        appErr
      );
      return NextResponse.json(
        { error: appErr.message },
        { status: 500 }
      );
    }

    const appliedSet = new Set(
      (appliedRows ?? []).map((r) => r.sales_event_id)
    );

    const unapplied = classified.filter(
      (r) => !appliedSet.has(r.sales_event_id)
    );

    console.log(`🔁 Already applied: ${appliedSet.size}`);
    console.log(`🚀 To apply this run: ${unapplied.length}`);

    if (unapplied.length === 0) {
      return NextResponse.json({ success: true, applied: 0 });
    }

    /* --------------------------------------------------
       4️⃣ LOAD PRODUCTS + STOCK DECISION
    -------------------------------------------------- */

    const productIds = Array.from(
      new Set(unapplied.map((r) => r.product_id))
    );

    const { data: products, error: prodErr } =
      await supabaseAdmin
        .from("products")
        .select("id, name, product_type, tracks_stock")
        .in("id", productIds);

    if (prodErr) {
      console.error("❌ Failed to load products", prodErr);
      return NextResponse.json(
        { error: prodErr.message },
        { status: 500 }
      );
    }

    const productRows = (products ?? []) as ProductRow[];

    const stockTracked: ClassifiedRow[] = [];
    const nonStockTracked: ClassifiedRow[] = [];

    for (const r of unapplied) {
      const p = productRows.find(
        (x) => x.id === r.product_id
      );

      const tracks =
        p?.tracks_stock === true ||
        (p?.tracks_stock === null &&
          p?.product_type === "food");

      console.log(
        `🔍 Sale ${r.sales_event_id} → ${p?.name} | product_type=${p?.product_type} | tracks_stock=${p?.tracks_stock} | RESULT=${
          tracks ? "STOCK" : "NON-STOCK"
        }`
      );

      if (tracks) stockTracked.push(r);
      else nonStockTracked.push(r);
    }

    console.log(`📦 Stock-tracked rows: ${stockTracked.length}`);
    console.log(`🟡 Non-stock rows: ${nonStockTracked.length}`);

    /* --------------------------------------------------
       5️⃣ APPLY STOCK MOVEMENTS
    -------------------------------------------------- */

    if (stockTracked.length > 0) {
      const movementsPayload: StockMovementInsert[] =
        stockTracked.map((r) => ({
          product_id: r.product_id,
          change: -Math.abs(r.quantity),
          reason: "food_sale_sumup",
          occurred_at: r.sold_at,
          source_sale_day: r.sale_day,
        }));

      const { data: movements, error: moveErr } =
        await supabaseAdmin
          .from("stock_movements")
          .insert(movementsPayload)
          .select("id");

      if (moveErr) {
        console.error(
          "❌ Failed to insert stock movements",
          moveErr
        );
        return NextResponse.json(
          { error: moveErr.message },
          { status: 500 }
        );
      }

      await supabaseAdmin
        
        .from("sales_stock_applications")
        .insert(
          stockTracked.map((r, i) => ({
            sales_event_id: r.sales_event_id,
            stock_movement_id: movements![i].id,
          }))
        );

      console.log(
        `📉 Inserted stock movements: ${movements!.length}`
      );
    }

    /* --------------------------------------------------
       6️⃣ MARK NON-STOCK ROWS AS APPLIED
    -------------------------------------------------- */

    if (nonStockTracked.length > 0) {
      await supabaseAdmin
        .from("sales_stock_applications")
        .insert(
          nonStockTracked.map((r) => ({
            sales_event_id: r.sales_event_id,
            stock_movement_id: null,
          }))
        );

      console.log(
        `🟢 Marked non-stock rows applied: ${nonStockTracked.length}`
      );
    }

    console.log("✅ Reconciliation apply complete");

    return NextResponse.json({
      success: true,
      applied: unapplied.length,
      applied_to_stock: stockTracked.length,
      applied_no_stock: nonStockTracked.length,
      from_day,
      to_day,
    });
  } catch (err: unknown) {
    console.error("🟥 Apply failed", err);

    const message =
      err instanceof Error ? err.message : "Unknown error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
