import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();

  // 1. Load categories in order
  const { data: categories, error: catErr } = await supabase
    .from("menu_categories")
    .select("*")
    .order("position", { ascending: true });

  if (catErr) {
    console.error("❌ menu category error:", catErr);
    return NextResponse.json({ categories: [] });
  }

  // 2. Load items in order
  const { data: items, error: itemErr } = await supabase
    .from("menu_items")
    .select("*")
    .order("position", { ascending: true });

  if (itemErr) {
    console.error("❌ menu items error:", itemErr);
    return NextResponse.json({ categories: [] });
  }

  // 3. Group items by category
  const grouped = categories.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.category_id === cat.id),
  }));

  return NextResponse.json({ menu: grouped });
}
