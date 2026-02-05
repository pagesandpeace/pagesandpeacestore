export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await supabaseServer();

    /* ------------------------------------------
       CURRENT MONTH (UTC, YYYY-MM-01)
    ------------------------------------------ */
    const { data: latestImport, error: monthError } = await supabase
  .from("product_rankings")
  .select("import_month")
  .eq("supplier_name", "gardners")
  .order("import_month", { ascending: false })
  .limit(1)
  .single();

if (monthError || !latestImport) {
  console.error("❌ No import month found", monthError);
  return NextResponse.json(
    { error: "No bestseller data available" },
    { status: 404 }
  );
}

const importMonth = latestImport.import_month;


    /* ------------------------------------------
       FETCH TOP 50 BESTSELLERS
    ------------------------------------------ */
    const { data, error } = await supabase
      .from("product_rankings")
      .select(`
        rank,
        products (
          id,
          name,
          display_title,
          slug,
          price,
          image_url,
          author
        )
      `)
      .eq("supplier_name", "gardners")
      .eq("import_month", importMonth)
      .order("rank", { ascending: true })
      .limit(50);

    if (error) {
      console.error("❌ BESTSELLERS QUERY FAILED", error);
      return NextResponse.json(
        { error: "Failed to load bestsellers" },
        { status: 500 }
      );
    }

    /* ------------------------------------------
       FILTER + LOG GHOST ROWS
    ------------------------------------------ */
    const ghostRows =
      data?.filter(
        (row) => !row.products || row.products.length === 0
      ) ?? [];

    if (ghostRows.length > 0) {
      console.warn("⚠️ BESTSELLERS: ghost ranking rows detected", {
        import_month: importMonth,
        count: ghostRows.length,
        ranks: ghostRows.map((r) => r.rank),
      });
    }

    /* ------------------------------------------
       NORMALISE FOR FRONTEND (SAFE)
    ------------------------------------------ */
    const items =
  data
    ?.map((row) => {
      const product = Array.isArray(row.products)
        ? row.products[0]
        : row.products;

      if (!product?.id) return null;

      return {
        ...product,
        bestseller_rank: row.rank,
        import_month: importMonth,
      };
    })
    .filter(Boolean) ?? [];




    return NextResponse.json({
      items,
      source: "gardners",
      import_month: importMonth,
      limit: 50,
      dropped_rows: ghostRows.length,
    });
  } catch (err) {
    console.error("❌ BESTSELLERS API ERROR", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
