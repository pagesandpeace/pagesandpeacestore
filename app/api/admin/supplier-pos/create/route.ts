export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type Body = {
  supplier_id: string;
  backorder_ids: string[];
};

function supplierCode(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
}

/* -------------------------
   UUID GUARD
------------------------- */
function isUUID(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export async function POST(req: Request) {
  console.log("🟡 [CREATE SUPPLIER PO] route hit");

  try {
    const supabase = await supabaseServer();

    /* -------------------------
       BODY (SANITISED)
    ------------------------- */
    const rawBody: Body = await req.json();

    const cleanBackorderIds = Array.isArray(rawBody.backorder_ids)
      ? rawBody.backorder_ids.filter(isUUID)
      : [];

    if (!isUUID(rawBody.supplier_id)) {
      return NextResponse.json(
        { error: "Invalid supplier ID" },
        { status: 400 }
      );
    }

    if (cleanBackorderIds.length === 0) {
      return NextResponse.json(
        { error: "No valid backorder IDs provided" },
        { status: 400 }
      );
    }

    console.log("🧹 sanitized backorder IDs:", cleanBackorderIds);

    /* -------------------------
       AUTH
    ------------------------- */
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    /* -------------------------
       LOAD SUPPLIER
    ------------------------- */
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("id", rawBody.supplier_id)
      .single();

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 400 }
      );
    }

    /* -------------------------
       PRE-FLIGHT BACKORDERS
    ------------------------- */
    const { data: backorders } = await supabase
      .from("customer_backorders")
      .select(
        "id, quantity, requested_quantity, ordered_at, cancelled_at"
      )
      .in("id", cleanBackorderIds);

    if (!backorders || backorders.length !== cleanBackorderIds.length) {
      return NextResponse.json(
        { error: "One or more backorders not found" },
        { status: 400 }
      );
    }

    for (const bo of backorders) {
      if (bo.ordered_at !== null) {
        return NextResponse.json(
          { error: "One or more backorders already ordered" },
          { status: 400 }
        );
      }

      if (bo.cancelled_at !== null) {
        return NextResponse.json(
          { error: "One or more backorders are cancelled" },
          { status: 400 }
        );
      }

      if (bo.quantity > bo.requested_quantity) {
        return NextResponse.json(
          { error: "Over-ordering is not allowed" },
          { status: 400 }
        );
      }
    }

    /* -------------------------
       GENERATE PO NUMBER
    ------------------------- */
    const code = supplierCode(supplier.name);
    const now = new Date();
    const year = now.getUTCFullYear();

    const { data: lastPO } = await supabase
      .from("supplier_purchase_orders")
      .select("po_sequence")
      .eq("supplier_id", supplier.id)
      .gte("ordered_at", `${year}-01-01T00:00:00.000Z`)
      .lt("ordered_at", `${year + 1}-01-01T00:00:00.000Z`)
      .order("po_sequence", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSequence = (lastPO?.po_sequence ?? 0) + 1;
    const poNumber = `${code}-${year}-${String(nextSequence).padStart(3, "0")}`;

    console.log("🧾 generated PO number:", poNumber);

    /* -------------------------
       CREATE PO
    ------------------------- */
    const { data: po } = await supabase
      .from("supplier_purchase_orders")
      .insert({
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        po_sequence: nextSequence,
        po_number: poNumber,
        status: "ordered",
        ordered_at: now.toISOString(),
        created_by: auth.user.id,
      })
      .select()
      .single();

    /* -------------------------
       ATTACH BACKORDERS (CRITICAL FIX)
    ------------------------- */
    const { data: updated } = await supabase
      .from("customer_backorders")
      .update({
        supplier_po_id: po.id,
        ordered_at: po.ordered_at,
        status: "ordered",
      })
      .in("id", cleanBackorderIds)
      .is("cancelled_at", null)
      .select("id");

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: "No backorders updated" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      po_id: po.id,
      po_number: po.po_number,
      updated_count: updated.length,
    });
  } catch (err) {
    console.error("🔥 create supplier PO crashed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
