export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

type Body = {
  id: string;
  received_quantity: number;
  notes?: string | null;
};

type BackorderUpdate = {
  received_quantity: number;
  status: "ordered" | "received";
  received_at?: string;
};

function isUUID(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export async function POST(req: Request) {
  console.log("🟡 [BACKORDER RECEIVE] route hit");

  try {
    /* ---------------- USER CONTEXT (AUTH) ---------------- */

    const authSupabase = await supabaseServer();
    const body: Body = await req.json();

    console.log("📦 raw body", body);

    if (!isUUID(body.id)) {
      return NextResponse.json(
        { error: "Invalid backorder id" },
        { status: 400 }
      );
    }

    const qtyNow = Number(body.received_quantity);
    if (!Number.isFinite(qtyNow) || qtyNow <= 0) {
      return NextResponse.json(
        { error: "received_quantity must be > 0" },
        { status: 400 }
      );
    }

    const { data: auth } = await authSupabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile } = await authSupabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    console.log("🟢 admin verified", { userId: auth.user.id });

    /* ---------------- SERVICE ROLE CLIENT ---------------- */

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    /* ---------------- LOAD BACKORDER ---------------- */

    const { data: row } = await supabase
      .from("customer_backorders")
      .select(
        `
        id,
        quantity,
        received_quantity,
        cancelled_quantity,
        collected_at
      `
      )
      .eq("id", body.id)
      .single();

    if (!row) {
      return NextResponse.json(
        { error: "Backorder not found" },
        { status: 404 }
      );
    }

    if (row.collected_at) {
      return NextResponse.json(
        { error: "Cannot receive on a closed backorder" },
        { status: 400 }
      );
    }

    const orderedQty = Number(row.quantity);
    const alreadyReceived = Number(row.received_quantity ?? 0);
    const cancelledQty = Number(row.cancelled_quantity ?? 0);

    const maxReceivable =
      orderedQty - alreadyReceived - cancelledQty;

    if (maxReceivable <= 0) {
      return NextResponse.json(
        { error: "No remaining quantity to receive" },
        { status: 400 }
      );
    }

    const applied = Math.min(qtyNow, maxReceivable);
    const newReceived = alreadyReceived + applied;

    const now = new Date().toISOString();

    /* ---------------- INSERT RECEIPT (AUDIT) ---------------- */

    const { error: receiptErr } = await supabase
      .from("backorder_receipts")
      .insert({
        backorder_id: row.id,
        quantity: applied,
        received_at: now,
        received_by: auth.user.id,
        notes: body.notes ?? null,
      });

    if (receiptErr) {
      console.error("❌ receipt insert failed", receiptErr);
      return NextResponse.json(
        { error: receiptErr.message },
        { status: 500 }
      );
    }

    /* ---------------- DERIVE STATUS ---------------- */

    const isFullyReceived =
      newReceived + cancelledQty === orderedQty;

    const update: BackorderUpdate = {
      received_quantity: newReceived,
      status: isFullyReceived ? "received" : "ordered",
    };

    if (alreadyReceived === 0) {
      update.received_at = now;
    }

    /* ---------------- UPDATE BACKORDER ---------------- */

    const { data: updated, error: updErr } = await supabase
      .from("customer_backorders")
      .update(update)
      .eq("id", row.id)
      .select(
        "id, quantity, received_quantity, cancelled_quantity, status, received_at"
      )
      .single();

    if (updErr) {
      console.error("❌ update failed", updErr);
      return NextResponse.json(
        { error: updErr.message },
        { status: 500 }
      );
    }

    console.log("✅ backorder received", {
      backorderId: row.id,
      applied,
      status: updated.status,
    });

    return NextResponse.json({
      success: true,
      applied,
      row: updated,
    });
  } catch (err) {
    console.error("🔥 [BACKORDER RECEIVE] fatal", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
