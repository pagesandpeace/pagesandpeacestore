export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/* ---------------------------------------------
   ADMIN CLIENT (SERVICE ROLE)
--------------------------------------------- */

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* ---------------------------------------------
   ROUTE
--------------------------------------------- */

export async function POST(req: Request) {
  console.log("🟡 [BACKORDERS BULK UPDATE] route hit");

  try {
    const supabase = await supabaseServer();
    const body = await req.json();

    const { ids, action } = body as {
      ids?: string[];
      action?: "received" | "collected" | "cancelled";
    };

    console.log("📥 action:", action);
    console.log("📥 backorder ids:", ids);

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids[] required" },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: "action required" },
        { status: 400 }
      );
    }

    /* -----------------------------------------
       AUTH (ADMIN ONLY)
    ----------------------------------------- */

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    const adminUserId = user.id;
    const now = new Date().toISOString();

    /* -----------------------------------------
       LOAD BACKORDERS
    ----------------------------------------- */

    const { data: rows, error: loadErr } = await supabaseAdmin
      .from("customer_backorders")
      .select(
        `
        id,
        quantity,
        received_quantity,
        cancelled_quantity,
        supplier_po_id
      `
      )
      .in("id", ids)
      .is("cancelled_at", null);

    if (loadErr) {
      console.error("❌ Failed loading backorders", loadErr);
      return NextResponse.json(
        { error: loadErr.message },
        { status: 500 }
      );
    }

    const supplierPoIds = Array.from(
      new Set(
        (rows ?? [])
          .map((r) => r.supplier_po_id)
          .filter(Boolean)
      )
    );

    console.log("📦 derived supplier PO ids:", supplierPoIds);

    /* =====================================================
       ACTION: RECEIVED
    ===================================================== */

    if (action === "received") {
      console.log("📦 Applying RECEIVED to backorders");

      for (const row of rows ?? []) {
        const ordered = Number(row.quantity);
        const received = Number(row.received_quantity ?? 0);
        const cancelled = Number(row.cancelled_quantity ?? 0);

        const remaining = ordered - received - cancelled;

        if (remaining <= 0) {
          console.log("↩️ Backorder already fully received", {
            backorderId: row.id,
          });
          continue;
        }

        /* ---------- AUDIT RECEIPT ---------- */

        await supabaseAdmin.from("backorder_receipts").insert({
          backorder_id: row.id,
          quantity: remaining,
          received_at: now,
          received_by: adminUserId,
          notes: "Bulk received",
        });

        /* ---------- UPDATE BACKORDER ---------- */

        await supabaseAdmin
          .from("customer_backorders")
          .update({
            received_quantity: received + remaining,
            received_at: now,
            status: "received",
          })
          .eq("id", row.id);

        console.log("✅ Backorder marked received", {
          backorderId: row.id,
          quantity: remaining,
        });
      }

      /* ---------- OPTIONAL: SUPPLIER PO ---------- */

      if (supplierPoIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("supplier_purchase_orders")
          .update({ received_at: now })
          .in("id", supplierPoIds)
          .select("id, received_at");

        console.log("✅ supplier_purchase_orders received_at updated:", data);
      }
    }

    /* =====================================================
       ACTION: COLLECTED
    ===================================================== */

    if (action === "collected") {
      console.log("📦 Applying COLLECTED to backorders");

      await supabaseAdmin
        .from("customer_backorders")
        .update({
          collected_at: now,
          status: "collected",
        })
        .in("id", ids);
    }

    /* =====================================================
       ACTION: CANCELLED
    ===================================================== */

    if (action === "cancelled") {
      console.log("📦 Applying CANCELLED to backorders");

      await supabaseAdmin
        .from("customer_backorders")
        .update({
          cancelled_at: now,
          status: "cancelled",
        })
        .in("id", ids);
    }

    console.log("✅ [BACKORDERS BULK UPDATE] completed");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("🔥 [BACKORDERS BULK UPDATE FATAL]", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
