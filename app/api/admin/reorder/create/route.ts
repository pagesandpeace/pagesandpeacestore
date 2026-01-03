export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    console.log("🟡 [BACKORDER CREATE] route hit");

    const supabase = await supabaseServer();

    /* -------------------------
       AUTH
    ------------------------- */
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("auth_user_id, role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    /* -------------------------
       BODY
    ------------------------- */
    const { product_id, quantity } = await req.json();

    if (!product_id || typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        { error: "Invalid product_id or quantity" },
        { status: 400 }
      );
    }

    /* -------------------------
       LOAD PRODUCT
    ------------------------- */
    const { data: product } = await supabase
      .from("products")
      .select("name, product_type, supplier_name")
      .eq("id", product_id)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const supplier =
      product.supplier_name ??
      (product.product_type === "book" ? "gardners" : "manual");

    /* -------------------------
       INSERT / UPDATE REQUEST
    ------------------------- */
    const { data: existing } = await supabase
      .from("supplier_order_requests")
      .select("id, quantity")
      .eq("product_id", product_id)
      .eq("status", "requested")
      .maybeSingle();

    let rowId: string;
    let finalQty: number;

    if (existing) {
      finalQty = existing.quantity + quantity;

      await supabase
        .from("supplier_order_requests")
        .update({ quantity: finalQty })
        .eq("id", existing.id);

      rowId = existing.id;
    } else {
      const { data } = await supabase
        .from("supplier_order_requests")
        .insert({
          product_id,
          quantity,
          supplier,
          item_type: product.product_type === "book" ? "book" : "stock",
          status: "requested",               // ✅ valid enum
          requested_by: profile.auth_user_id // ✅ FIX
        })
        .select("id")
        .single();

      rowId = data!.id;
      finalQty = quantity;
    }

    return NextResponse.json({
      id: rowId,
      product_name: product.name,
      item_type: product.product_type === "book" ? "book" : "stock",
      supplier,
      quantity: finalQty,
      status: "requested"
    });
  } catch (err) {
    console.error("🔥 [BACKORFDER CREATE] crashed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
