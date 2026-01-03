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
    const now = new Date();
    const importMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    )
      .toISOString()
      .slice(0, 10);

    /* ------------------------------------------
       FETCH TOP 50 BESTSELLERS (OPTION B)
    ------------------------------------------ */
    const { data, error } = await supabase
      .from("product_rankings")
      .select(
        `
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
      `
      )
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
       NORMALISE FOR FRONTEND
    ------------------------------------------ */
    const items =
      data?.map((row) => ({
        ...row.products,
        bestseller_rank: row.rank,
      })) ?? [];

    return NextResponse.json({
      items,
      source: "gardners",
      import_month: importMonth,
      limit: 50,
    });
  } catch (err) {
    console.error("❌ BESTSELLERS API ERROR", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
