import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const FOOD_PRODUCT_TYPES = [
  "food",
  "drink",
  "ingredient",
];

export async function GET() {
  const q = supabase
    .from("products")
    .select("id, name, product_type")
    .in("product_type", FOOD_PRODUCT_TYPES)
    .order("name");

  const { data, error } = await q;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ products: data ?? [] });
}
