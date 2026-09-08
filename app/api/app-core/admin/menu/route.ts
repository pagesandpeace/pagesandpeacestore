import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseService();
  const [{ data: categories, error: categoryError }, { data: items, error: itemError }] = await Promise.all([
    db.from("menu_categories").select("id, name, position").order("position"),
    db.from("menu_items").select("id, category_id, name, price, position, note, is_visible").order("position"),
  ]);

  if (categoryError || itemError) {
    return NextResponse.json({ error: categoryError?.message || itemError?.message || "Unable to load menu" }, { status: 500 });
  }

  return NextResponse.json({ categories: categories ?? [], items: items ?? [] });
}

export async function PATCH(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const id = String(body?.id || "");
  const name = String(body?.name || "").trim();
  const price = Number(body?.price);
  const note = body?.note == null ? null : String(body.note).trim() || null;
  const is_visible = Boolean(body?.is_visible);
  const position = Number(body?.position ?? 0);

  if (!id || !name || !Number.isFinite(price) || price < 0 || !Number.isFinite(position)) {
    return NextResponse.json({ error: "Invalid menu item" }, { status: 400 });
  }

  const { data, error } = await supabaseService()
    .from("menu_items")
    .update({ name, price, note, is_visible, position })
    .eq("id", id)
    .select("id, category_id, name, price, position, note, is_visible")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, item: data });
}
