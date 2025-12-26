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
      .eq("auth_user_id", auth.user.id)
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
       EXTRACT INVENTORY
       (must NOT be updated directly)
    ------------------------- */
    const { inventory_count } = body;

    /* -------------------------
       ALLOWED NON-INVENTORY FIELDS
    ------------------------- */
    const updatableFields = [
      "name",
      "slug",
      "description",
      "price",
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

    console.log("🛠 Final product updateData:", updateData);

    /* -------------------------
       UPDATE PRODUCT (NON-INVENTORY)
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

    /* -------------------------
       INVENTORY ADJUSTMENT (AUDITED)
    ------------------------- */
    if (typeof inventory_count === "number") {
      console.log("📦 Admin inventory adjustment", {
        productId,
        inventory_count,
        adminUserId: auth.user.id,
      });

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
        console.error("❌ Inventory adjustment failed", inventoryError);
        return NextResponse.json(
          { error: "Inventory update failed" },
          { status: 500 }
        );
      }
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
