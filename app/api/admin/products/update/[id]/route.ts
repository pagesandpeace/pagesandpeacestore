export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    /* -------------------------
       ✅ UNWRAP PARAMS (FIX)
    ------------------------- */
    const { id: productId } = await params;

    console.log("🔎 Updating product:", productId);

    const supabase = await supabaseServer();

    /* -------------------------
       AUTH CHECK
    ------------------------- */
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    /* -------------------------
       READ BODY
    ------------------------- */
    const body = await req.json();
    console.log("📨 Incoming body:", body);

    const { inventory_count } = body;

    const updatableFields = [
      "name",
      "slug",
      "description",
      "price",
      "image_url",
      "author_id",
      "format",
      "language",
      "genre_id",
      "vibe_id",
      "theme_id",
    ] as const;

    const updateData: Record<string, unknown> = {};

    for (const key of updatableFields) {
      if (body[key] === "") updateData[key] = null;
      else if (body[key] !== undefined) updateData[key] = body[key];
    }

    console.log("🛠 Final product updateData:", updateData);

    /* -------------------------
       UPDATE PRODUCT
    ------------------------- */
    const { error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", productId);

    if (error) {
      console.error("❌ DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    /* -------------------------
       INVENTORY ADJUSTMENT
    ------------------------- */
    if (typeof inventory_count === "number") {
      const { error: inventoryError } = await supabase.rpc(
        "adjust_product_inventory",
        {
          p_product_id: productId,
          p_new_quantity: inventory_count,
          p_reason: "admin_adjustment",
          p_user_id: auth.user.id,
        }
      );

      if (inventoryError) {
        console.error("❌ Inventory error:", inventoryError);
        return NextResponse.json(
          { error: "Inventory update failed" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("🔥 Update route crashed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
