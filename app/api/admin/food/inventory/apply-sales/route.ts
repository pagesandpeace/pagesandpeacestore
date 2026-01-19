import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 [INVENTORY APPLY SALES] start");

  /* ---------------------------------------------
     1. LOAD UNAPPLIED, RESOLVED SALES
  --------------------------------------------- */

  const { data: sales, error: salesError } =
    await supabaseAdmin
      .from("shop_sales_items")
      .select(`
        id,
        product_id,
        quantity,
        domain
      `)
      .eq("stock_applied", false)
      .not("product_id", "is", null)
      .eq("resolution_status", "manually_matched");

  if (salesError) {
    console.error("❌ Failed to fetch sales", salesError);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }

  if (!sales || sales.length === 0) {
    console.log("ℹ️ No sales to apply");
    return NextResponse.json({ success: true, applied: 0 });
  }

  console.log(`🔁 Applying ${sales.length} sales`);

  /* ---------------------------------------------
     2. BUILD STOCK MOVEMENTS
  --------------------------------------------- */

  const stockMovements: {
    product_id: string;
    change: number;
    reason: string;
  }[] = [];

  for (const sale of sales) {
    // FOOD → direct decrement
    if (sale.domain === "food") {
      stockMovements.push({
        product_id: sale.product_id,
        change: -sale.quantity,
        reason: "food_sale_sumup",
      });
    }

    // DRINK → expand BOM
    if (sale.domain === "drink") {
      const { data: bom, error: bomError } =
        await supabaseAdmin
          .from("drink_boms")
          .select("ingredient_product_id, quantity")
          .eq("drink_product_id", sale.product_id);

      if (bomError) {
        console.error(
          "❌ Failed to load BOM",
          sale.product_id,
          bomError
        );
        return NextResponse.json(
          { error: "Failed to load drink BOM" },
          { status: 500 }
        );
      }

      for (const ingredient of bom ?? []) {
        stockMovements.push({
          product_id: ingredient.ingredient_product_id,
          change: -ingredient.quantity * sale.quantity,
          reason: "drink_sale_sumup",
        });
      }
    }
  }

  if (stockMovements.length === 0) {
    console.log("ℹ️ No stock movements required");
  } else {
    const { error: moveError } =
      await supabaseAdmin
        .from("stock_movements")
        .insert(stockMovements);

    if (moveError) {
      console.error("❌ Failed to insert stock movements", moveError);
      return NextResponse.json(
        { error: "Failed to apply stock movements" },
        { status: 500 }
      );
    }
  }

  /* ---------------------------------------------
     3. MARK SALES AS APPLIED
  --------------------------------------------- */

  const saleIds = sales.map((s) => s.id);

  const { error: updateError } =
    await supabaseAdmin
      .from("shop_sales_items")
      .update({
        stock_applied: true,
        stock_applied_at: new Date().toISOString(),
      })
      .in("id", saleIds);

  if (updateError) {
    console.error("❌ Failed to mark sales applied", updateError);
    return NextResponse.json(
      { error: "Failed to update sales rows" },
      { status: 500 }
    );
  }

  console.log("✅ Inventory updated successfully");

  return NextResponse.json({
    success: true,
    applied: sales.length,
  });
}
