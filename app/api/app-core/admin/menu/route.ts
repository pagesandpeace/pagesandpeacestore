import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

const validAreas = new Set(["drinks", "food", "snacks", "merch"]);

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseService();
  const [{ data: categories, error: categoryError }, { data: items, error: itemError }] = await Promise.all([
    db.from("menu_categories").select("id, name, position, website_area").order("position"),
    db.from("menu_items").select("id, category_id, name, price, position, note, is_visible").order("position"),
  ]);

  if (categoryError || itemError) {
    return NextResponse.json({ error: categoryError?.message || itemError?.message || "Unable to load menu" }, { status: 500 });
  }

  return NextResponse.json({ categories: categories ?? [], items: items ?? [] });
}

export async function POST(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const type = String(body?.type || "");
  const db = supabaseService();

  if (type === "category") {
    const name = String(body?.name || "").trim();
    const website_area = String(body?.website_area || "food");
    if (!name || !validAreas.has(website_area)) {
      return NextResponse.json({ error: "Category name and website area are required" }, { status: 400 });
    }

    const { data: last } = await db.from("menu_categories").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
    const position = Number(last?.position ?? -1) + 1;

    const { data, error } = await db
      .from("menu_categories")
      .insert({ name, position, website_area })
      .select("id, name, position, website_area")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, category: data });
  }

  if (type === "item") {
    const category_id = String(body?.category_id || "");
    const name = String(body?.name || "").trim();
    const price = Number(body?.price);
    const note = body?.note == null ? null : String(body.note).trim() || null;

    if (!category_id || !name || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Category, name and a valid price are required" }, { status: 400 });
    }

    const { data: category } = await db.from("menu_categories").select("id").eq("id", category_id).maybeSingle();
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });

    const { data: last } = await db
      .from("menu_items")
      .select("position")
      .eq("category_id", category_id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = Number(last?.position ?? -1) + 1;

    const { data, error } = await db
      .from("menu_items")
      .insert({ category_id, name, price, note, position, is_visible: true })
      .select("id, category_id, name, price, position, note, is_visible")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, item: data });
  }

  return NextResponse.json({ error: "Invalid menu action" }, { status: 400 });
}

export async function PATCH(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const type = String(body?.type || "item");
  const db = supabaseService();

  if (type === "category") {
    const id = String(body?.id || "");
    const name = String(body?.name || "").trim();
    const website_area = String(body?.website_area || "");
    if (!id || !name || !validAreas.has(website_area)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const { data, error } = await db
      .from("menu_categories")
      .update({ name, website_area })
      .eq("id", id)
      .select("id, name, position, website_area")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, category: data });
  }

  const id = String(body?.id || "");
  const name = String(body?.name || "").trim();
  const price = Number(body?.price);
  const note = body?.note == null ? null : String(body.note).trim() || null;
  const is_visible = Boolean(body?.is_visible);
  const position = Number(body?.position ?? 0);

  if (!id || !name || !Number.isFinite(price) || price < 0 || !Number.isFinite(position)) {
    return NextResponse.json({ error: "Invalid menu item" }, { status: 400 });
  }

  const { data, error } = await db
    .from("menu_items")
    .update({ name, price, note, is_visible, position })
    .eq("id", id)
    .select("id, category_id, name, price, position, note, is_visible")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, item: data });
}
