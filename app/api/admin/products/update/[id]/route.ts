export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    /* -------------------------
       ✅ UNWRAP PARAMS (REQUIRED)
    ------------------------- */
    const { id: productId } = await context.params;

    console.log("🔎 Updating product:", productId);

    const supabase = await supabaseServer();

    /* -------------------------
       AUTH CHECK
    ------------------------- */
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    /* -------------------------
       READ BODY
    ------------------------- */
    const body = await req.json();
    console.log("📨 Incoming body:", body);

    /* -------------------------
       ALLOWED FIELDS
    ------------------------- */
    const updatableFields = [
      "name",
      "slug",
      "description",
      "price",
      "inventory_count",
      "image_url",
      "author",
      "format",
      "language",
      "genre_id",
      "vibe_id",
      "theme_id",
    ] as const;

    const updateData: Record<string, unknown> = {};

    for (const key of updatableFields) {
      const value = body[key];

      if (value === "") {
        updateData[key] = null;
        continue;
      }

      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    console.log("🛠 Final updateData:", updateData);

    /* -------------------------
       UPDATE PRODUCT
    ------------------------- */
    const { data, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", productId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ DB error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, product: data });

  } catch (err) {
    console.error("🔥 Update route crashed:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
