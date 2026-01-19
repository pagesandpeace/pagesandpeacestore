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

type StockInItem = {
  product_id: string;
  quantity: number;
  unit_cost?: number | null;
};

type StockInBody = {
  supplier_name?: string;
  invoice_number?: string | null;
  invoice_date?: string;
  items?: StockInItem[];
};

/* ---------------------------------------------
   ROUTE
--------------------------------------------- */

export async function POST(req: Request) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 [FOOD STOCK IN] start");

  try {
    const body: unknown = await req.json();

    const {
      supplier_name,
      invoice_number,
      invoice_date,
      items,
    } = body as StockInBody;

    if (
      !supplier_name ||
      !invoice_date ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    console.log("🧾 Supplier:", supplier_name);
    console.log("📅 Invoice date:", invoice_date);
    console.log("📦 Items:", items.length);

    /* --------------------------------------------------
       1️⃣ CREATE SUPPLIER INVOICE
    -------------------------------------------------- */

    const { data: invoice, error: invoiceError } =
      await supabaseAdmin
        .from("supplier_invoices")
        .insert({
          supplier_name,
          invoice_number,
          invoice_date,
        })
        .select()
        .single();

    if (invoiceError) {
      console.error(
        "❌ Failed to create invoice",
        invoiceError
      );
      throw invoiceError;
    }

    /* --------------------------------------------------
       2️⃣ INSERT STOCK MOVEMENTS (CRITICAL FIX)
    -------------------------------------------------- */

    const movements = items.map((item) => ({
      product_id: item.product_id,
      change: Math.abs(item.quantity),
      unit_cost: item.unit_cost ?? null,
      supplier_invoice_id: invoice.id,

      reason: "supplier_delivery",

      // 🔴 THESE TWO LINES FIX THE CHART
      occurred_at: invoice_date,
      source_sale_day: invoice_date,
    }));

    const { error: movementError } =
      await supabaseAdmin
        .from("stock_movements")
        .insert(movements);

    if (movementError) {
      console.error(
        "❌ Failed to insert stock movements",
        movementError
      );
      throw movementError;
    }

    console.log(
      "✅ Stock received:",
      movements.length,
      "rows"
    );

    return NextResponse.json({
      success: true,
      invoice_id: invoice.id,
      rows: movements.length,
    });
  } catch (err: unknown) {
    console.error("🟥 Stock in failed", err);

    const message =
      err instanceof Error
        ? err.message
        : "Failed to record stock in";

    return NextResponse.json(
      {
        error: "Failed to record stock in",
        details: message,
      },
      { status: 500 }
    );
  }
}
