import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🍽️ [FOOD / DRINK / INGREDIENT PRODUCTS] fetch");

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, product_type")
    .in("product_type", ["food", "drink", "ingredient"])
    .order("name");

  if (error) {
    console.error("❌ Failed to fetch products", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
