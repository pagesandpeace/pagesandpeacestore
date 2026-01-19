import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: Request) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("➕ [FOOD PRODUCT CREATE] start");

  try {
    const { name, product_type = "food" } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    if (!["food", "drink", "ingredient"].includes(product_type)) {
      return NextResponse.json(
        { error: "Invalid product type" },
        { status: 400 }
      );
    }

    const slug = slugify(name);

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({
        name: name.trim(),
        slug,
        price: 0, // required by schema
        product_type,               // ✅ canonical
        fulfilment_mode: "stock",    // food / ingredients are stocked
        supply_source: "stock",
        tracks_stock: true,
        allows_waste: product_type !== "ingredient",
      })
      .select("id, name")
      .single();

    if (error) {
      console.error("❌ Product create failed", error);
      return NextResponse.json(
        { error: "Failed to create product" },
        { status: 500 }
      );
    }

    console.log("✅ Product created", data.id);
    return NextResponse.json(data);
  } catch (err) {
    console.error("🟥 Product create error", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
