import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function requireAdmin() {
  const admin = await requireAdminUser();
  if (!admin) return null;
  return supabaseService().schema("app_core");
}

export async function GET() {
  const db = await requireAdmin();
  if (!db) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: sections, error: sectionError }, { data: categories, error: categoryError }, { data: items, error: itemError }] = await Promise.all([
    db.from("menu_sections").select("id, name, slug, position, is_visible").order("position").order("name"),
    db.from("menu_categories").select("id, name, position, section_id").order("position").order("name"),
    db.from("menu_items").select("id, category_id, name, price, position, note, is_visible").order("position").order("name"),
  ]);

  if (sectionError || categoryError || itemError) {
    return NextResponse.json({ error: sectionError?.message || categoryError?.message || itemError?.message || "Unable to load menu" }, { status: 500 });
  }

  return NextResponse.json({ sections: sections ?? [], categories: categories ?? [], items: items ?? [] });
}

export async function POST(req: Request) {
  const db = await requireAdmin();
  if (!db) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const type = String(body?.type || "");

  if (type === "section") {
    const name = String(body?.name || "").trim();
    const slug = slugify(String(body?.slug || name));
    if (!name || !slug) return NextResponse.json({ error: "Tab name is required" }, { status: 400 });
    const { data: existing } = await db.from("menu_sections").select("id, name, slug, position, is_visible").eq("slug", slug).maybeSingle();
    if (existing) return NextResponse.json({ success: true, section: existing, existing: true });
    const { data: last } = await db.from("menu_sections").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await db.from("menu_sections").insert({ name, slug, display_mode: "menu_tab", position: Number(last?.position ?? -1) + 1, is_visible: true }).select("id, name, slug, position, is_visible").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, section: data });
  }

  if (type === "category") {
    const section_id = String(body?.section_id || "");
    const name = String(body?.name || "").trim();
    if (!section_id || !name) return NextResponse.json({ error: "Tab and category name are required" }, { status: 400 });
    const { data: last } = await db.from("menu_categories").select("position").eq("section_id", section_id).order("position", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await db.from("menu_categories").insert({ name, section_id, position: Number(last?.position ?? -1) + 1 }).select("id, name, position, section_id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, category: data });
  }

  if (type === "item") {
    const category_id = String(body?.category_id || "");
    const name = String(body?.name || "").trim();
    const price = Number(body?.price);
    const note = body?.note == null ? null : String(body.note).trim() || null;
    if (!category_id || !name || !Number.isFinite(price) || price < 0) return NextResponse.json({ error: "Category, item name and valid price are required" }, { status: 400 });
    const { data: last } = await db.from("menu_items").select("position").eq("category_id", category_id).order("position", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await db.from("menu_items").insert({ category_id, name, price, note, position: Number(last?.position ?? -1) + 1, is_visible: true }).select("id, category_id, name, price, position, note, is_visible").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, item: data });
  }

  return NextResponse.json({ error: "Invalid menu action" }, { status: 400 });
}

export async function PATCH(req: Request) {
  const db = await requireAdmin();
  if (!db) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const type = String(body?.type || "item");

  if (type === "reorder") {
    const level = String(body?.level || "");
    const orderedIds = Array.isArray(body?.orderedIds) ? body.orderedIds.map(String) : [];
    const table = level === "section" ? "menu_sections" : level === "category" ? "menu_categories" : level === "item" ? "menu_items" : null;
    if (!table || orderedIds.length === 0) return NextResponse.json({ error: "Invalid reorder request" }, { status: 400 });
    for (let position = 0; position < orderedIds.length; position += 1) {
      const { error } = await db.from(table).update({ position }).eq("id", orderedIds[position]);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (type === "section") {
    const id = String(body?.id || "");
    const name = String(body?.name || "").trim();
    const slug = slugify(String(body?.slug || name));
    const is_visible = Boolean(body?.is_visible);
    if (!id || !name || !slug) return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
    const { data, error } = await db.from("menu_sections").update({ name, slug, display_mode: "menu_tab", is_visible, updated_at: new Date().toISOString() }).eq("id", id).select("id, name, slug, position, is_visible").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, section: data });
  }

  if (type === "category") {
    const id = String(body?.id || "");
    const name = String(body?.name || "").trim();
    const section_id = String(body?.section_id || "");
    if (!id || !name || !section_id) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    const { data, error } = await db.from("menu_categories").update({ name, section_id }).eq("id", id).select("id, name, position, section_id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, category: data });
  }

  const id = String(body?.id || "");
  const name = String(body?.name || "").trim();
  const price = Number(body?.price);
  const note = body?.note == null ? null : String(body.note).trim() || null;
  const is_visible = Boolean(body?.is_visible);
  if (!id || !name || !Number.isFinite(price) || price < 0) return NextResponse.json({ error: "Invalid menu item" }, { status: 400 });
  const { data, error } = await db.from("menu_items").update({ name, price, note, is_visible }).eq("id", id).select("id, category_id, name, price, position, note, is_visible").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, item: data });
}

export async function DELETE(req: Request) {
  const db = await requireAdmin();
  if (!db) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const type = String(body?.type || "");
  const id = String(body?.id || "");
  if (!id || !["section", "category", "item"].includes(type)) return NextResponse.json({ error: "Invalid delete request" }, { status: 400 });

  if (type === "item") {
    const { error } = await db.from("menu_items").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (type === "category") {
    const { error: itemError } = await db.from("menu_items").delete().eq("category_id", id);
    if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });
    const { error } = await db.from("menu_categories").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { data: categoryRows, error: categoryReadError } = await db.from("menu_categories").select("id").eq("section_id", id);
  if (categoryReadError) return NextResponse.json({ error: categoryReadError.message }, { status: 500 });
  const categoryIds = (categoryRows ?? []).map((row) => row.id);
  if (categoryIds.length) {
    const { error: itemError } = await db.from("menu_items").delete().in("category_id", categoryIds);
    if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });
    const { error: categoryError } = await db.from("menu_categories").delete().in("id", categoryIds);
    if (categoryError) return NextResponse.json({ error: categoryError.message }, { status: 500 });
  }
  const { error } = await db.from("menu_sections").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
