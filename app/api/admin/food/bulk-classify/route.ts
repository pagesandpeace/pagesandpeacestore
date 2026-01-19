import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const ALLOWED_PRODUCT_TYPES = ["food", "drink", "book", "merch"] as const;

type BulkClassifyBody = {
  salesEventIds: string[];
  product_id?: string | null;
  ignored?: boolean;
  apply_to_future?: boolean;
  raw_name?: string;
};

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    const {
      salesEventIds,
      product_id,
      ignored,
      apply_to_future,
      raw_name,
    } = body as BulkClassifyBody;

    if (!Array.isArray(salesEventIds) || salesEventIds.length === 0) {
      return NextResponse.json(
        { error: "Missing salesEventIds" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       1. WIPE EXISTING CLASSIFICATIONS
    -------------------------------------------------- */
    await supabaseAdmin
      .schema("fd")
      .from("sales_classifications")
      .delete()
      .in("sales_event_id", salesEventIds);

    /* --------------------------------------------------
       2. IGNORE PATH
    -------------------------------------------------- */
    if (ignored) {
      const payload = salesEventIds.map((id) => ({
        sales_event_id: id,
        category: "other",
        product_id: null,
        ignored: true,
        classified_by: "manual",
      }));

      await supabaseAdmin
        .schema("fd")
        .from("sales_classifications")
        .insert(payload);

      return NextResponse.json({ success: true });
    }

    /* --------------------------------------------------
       3. PRODUCT PATH
    -------------------------------------------------- */
    if (!product_id) {
      return NextResponse.json(
        { error: "Missing product_id" },
        { status: 400 }
      );
    }

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, product_type")
      .eq("id", product_id)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: "Invalid product_id" },
        { status: 400 }
      );
    }

    const category = product.product_type;

    if (!ALLOWED_PRODUCT_TYPES.includes(category)) {
      return NextResponse.json(
        {
          error: `Product type "${category}" cannot be classified`,
        },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       4. INSERT CLASSIFICATIONS
    -------------------------------------------------- */
    const payload = salesEventIds.map((id) => ({
      sales_event_id: id,
      category,
      product_id,
      ignored: false,
      classified_by: "manual",
    }));

    await supabaseAdmin
      .schema("fd")
      .from("sales_classifications")
      .insert(payload);

    /* --------------------------------------------------
       5. OPTIONAL: CREATE / UPDATE RULE
    -------------------------------------------------- */
    if (apply_to_future && raw_name) {
      await supabaseAdmin
        .schema("fd")
        .from("sales_classification_rules")
        .upsert(
          {
            raw_name,
            product_id,
            category,
          },
          { onConflict: "raw_name" }
        );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("❌ BULK CLASSIFY FAILED", err);

    const message =
      err instanceof Error
        ? err.message
        : "Bulk classify failed";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
