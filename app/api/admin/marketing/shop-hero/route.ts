import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/auth-server";

/* ------------------------------------------------------
   GET — returns the hero block (creates if missing)
------------------------------------------------------ */
export async function GET() {
  const supabase = await supabaseServer();

  console.log("🔍 [GET] shop_hero called");

  const { data: existing, error: selectErr } = await supabase
    .from("marketing_blocks")
    .select("*")
    .eq("key", "shop_hero")
    .maybeSingle();

  console.log("📥 [GET] existing row:", existing);
  console.log("⚠️ [GET] select error:", selectErr);

  if (selectErr) {
    return NextResponse.json({ error: selectErr.message }, { status: 500 });
  }

  if (!existing) {
    console.log("⚠️ [GET] No row — inserting default…");

    const { data: inserted, error: insertErr } = await supabase
      .from("marketing_blocks")
      .insert({
        key: "shop_hero",
        title: "",
        subtitle: "",
        cta_text: "",
        cta_link: "",
        image_url: null,
        visible: false,
      })
      .select()
      .single();

    console.log("📥 [GET] INSERT result:", inserted);
    console.log("⚠️ [GET] INSERT error:", insertErr);

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json(inserted);
  }

  console.log("✅ [GET] returning existing:", existing);
  return NextResponse.json(existing);
}

/* ------------------------------------------------------
   PATCH — update only, logs enabled
------------------------------------------------------ */
export async function PATCH(req: Request) {
  const supabase = await supabaseServer();
  const body = await req.json();

  console.log("📤 [PATCH] BODY RECEIVED:", JSON.stringify(body, null, 2));
  console.log("📸 [PATCH] Incoming image_url:", body.image_url);

  // Check existing row
  const { data: existing, error: existsErr } = await supabase
    .from("marketing_blocks")
    .select("*")
    .eq("key", "shop_hero")
    .maybeSingle();

  console.log("🔎 [PATCH] Existing row:", existing);
  console.log("⚠️ [PATCH] Existing row error:", existsErr);

  if (existsErr) {
    return NextResponse.json({ error: existsErr.message }, { status: 500 });
  }

  if (!existing) {
    console.log("⚠️ [PATCH] No existing row — inserting new one…");

    const { data: inserted, error: insertErr } = await supabase
      .from("marketing_blocks")
      .insert({
        key: "shop_hero",
        title: body.title ?? "",
        subtitle: body.subtitle ?? "",
        cta_text: body.cta_text ?? "",
        cta_link: body.cta_link ?? "",
        image_url: body.image_url ?? null,
        visible: body.visible ?? true,
        starts_at: body.starts_at ?? null,
        ends_at: body.ends_at ?? null,
      })
      .select()
      .single();

    console.log("📥 [PATCH] INSERT result:", inserted);
    console.log("⚠️ [PATCH] INSERT error:", insertErr);

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json(inserted);
  }

  console.log("✏️ [PATCH] Updating row id:", existing.id);

  const { data: updated, error: updateErr } = await supabase
    .from("marketing_blocks")
    .update({
      title: body.title ?? "",
      subtitle: body.subtitle ?? "",
      cta_text: body.cta_text ?? "",
      cta_link: body.cta_link ?? "",
      image_url: body.image_url ?? null,
      visible: body.visible ?? true,
      starts_at: body.starts_at ?? null,
      ends_at: body.ends_at ?? null,
    })
    .eq("id", existing.id)
    .select()
    .single();

  console.log("📤 [PATCH] UPDATE result:", updated);
  console.log("❌ [PATCH] UPDATE error:", updateErr);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
