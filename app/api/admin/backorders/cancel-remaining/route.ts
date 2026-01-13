export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type Body = {
  id: string;
  reason: string;
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
  console.log("🟡 [BACKORDER CANCEL REMAINING] route hit");

  try {
    const supabase = await supabaseServer();
    const body: Body = await req.json();

    if (!isUUID(body.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    if (!body.reason || body.reason.trim().length < 3) {
      return NextResponse.json(
        { error: "Cancellation reason required" },
        { status: 400 }
      );
    }

    /* ---------- AUTH ---------- */
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

    /* ---------- LOAD ROW ---------- */
    const { data: row, error: rowErr } = await supabase
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

    if (rowErr || !row) {
      return NextResponse.json(
        { error: "Backorder not found" },
        { status: 404 }
      );
    }

    if (row.collected_at) {
      return NextResponse.json(
        { error: "Backorder already collected" },
        { status: 400 }
      );
    }

    const orderedQty = Number(row.quantity);
    const receivedQty = Number(row.received_quantity ?? 0);
    const cancelledQty = Number(row.cancelled_quantity ?? 0);

    const remaining = orderedQty - receivedQty - cancelledQty;

    if (remaining <= 0) {
      return NextResponse.json(
        { error: "No remaining quantity to cancel" },
        { status: 400 }
      );
    }

    console.log("🧮 cancel remaining:", {
      orderedQty,
      receivedQty,
      cancelledQty,
      remaining,
    });

    /* ---------- UPDATE ---------- */
    const { data: updated, error: updErr } = await supabase
      .from("customer_backorders")
      .update({
        cancelled_quantity: cancelledQty + remaining,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: body.reason.trim(),
      })
      .eq("id", body.id)
      .select(
        "id, quantity, received_quantity, cancelled_quantity, cancelled_at"
      )
      .single();

    if (updErr) {
      console.error("❌ cancel remaining failed", updErr);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, row: updated });
  } catch (err) {
    console.error("🔥 cancel remaining crashed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
