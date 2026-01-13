import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    console.log("🟡 [MARK PICKED] route hit");

    /* ---------------------------------------------------------
       AUTH (admin only)
    --------------------------------------------------------- */
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("🔒 [MARK PICKED] not authenticated");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      console.warn("⛔ [MARK PICKED] forbidden", { userId: user.id });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("🟢 [MARK PICKED] admin verified", { userId: user.id });

    /* ---------------------------------------------------------
       PARSE BODY
    --------------------------------------------------------- */
    const body = await req.json();

    const items: { source: "online" | "backorder"; id: string }[] =
      body.items ?? [];

    console.log("📥 [MARK PICKED] received items", { items });

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items[] required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    /* ---------------------------------------------------------
       SPLIT BY SOURCE
    --------------------------------------------------------- */
    const onlineItemIds = items
      .filter((i) => i.source === "online")
      .map((i) => i.id);

    const backorderIds = items
      .filter((i) => i.source === "backorder")
      .map((i) => i.id);

    /* ---------------------------------------------------------
       1️⃣ MARK ONLINE ORDER ITEMS AS PICKED
    --------------------------------------------------------- */
    if (onlineItemIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("order_items")
        .update({ picked_at: now })
        .in("id", onlineItemIds)
        .is("picked_at", null);

      if (error) {
        console.error("❌ [MARK PICKED] online items update failed", error);
        return NextResponse.json(
          { error: "Failed to mark online items picked" },
          { status: 500 }
        );
      }

      console.log("✏️ [MARK PICKED] online items marked picked", {
        count: onlineItemIds.length,
        picked_at: now,
      });
    }

    /* ---------------------------------------------------------
       2️⃣ FIND AFFECTED ONLINE ORDERS
    --------------------------------------------------------- */
    let orderIds: string[] = [];

    if (onlineItemIds.length > 0) {
      const { data: affectedItems } = await supabaseAdmin
        .from("order_items")
        .select("order_id")
        .in("id", onlineItemIds);

      orderIds = Array.from(
        new Set((affectedItems ?? []).map((i) => i.order_id))
      );

      console.log("📦 [MARK PICKED] affected orders", { orderIds });
    }

    /* ---------------------------------------------------------
       3️⃣ FINALISE FULLY PICKED ORDERS
    --------------------------------------------------------- */
    for (const orderId of orderIds) {
      const { data: remaining } = await supabaseAdmin
        .from("order_items")
        .select("id")
        .eq("order_id", orderId)
        .eq("kind", "product")
        .is("picked_at", null)
        .limit(1);

      if (remaining && remaining.length > 0) {
        console.log("⏳ [MARK PICKED] order still has unpicked items", {
          orderId,
        });
        continue;
      }

      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("paid_at, status, ready_for_collection_at")
        .eq("id", orderId)
        .single();

      const isPaid =
        order?.status === "completed" && order?.paid_at !== null;

      console.log("🔍 [MARK PICKED] order payment state", {
        orderId,
        isPaid,
      });

      if (isPaid && !order?.ready_for_collection_at) {
        const { error } = await supabaseAdmin
          .from("orders")
          .update({ ready_for_collection_at: now })
          .eq("id", orderId);

        if (error) {
          console.error(
            "❌ [MARK PICKED] failed to persist ready_for_collection_at",
            { orderId, error }
          );
        } else {
          console.log("🟢 [MARK PICKED] ready_for_collection_at persisted", {
            orderId,
            ready_for_collection_at: now,
          });
        }
      }
    }

    /* ---------------------------------------------------------
       4️⃣ MARK BACKORDERS AS PICKED
    --------------------------------------------------------- */
    if (backorderIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("customer_backorders")
        .update({ picked_at: now })
        .in("id", backorderIds)
        .is("picked_at", null);

      if (error) {
        console.error("❌ [MARK PICKED] backorders update failed", error);
        return NextResponse.json(
          { error: "Failed to mark backorders picked" },
          { status: 500 }
        );
      }

      console.log("📦 [MARK PICKED] backorders marked picked", {
        count: backorderIds.length,
        picked_at: now,
      });
    }

    console.log("✅ [MARK PICKED] completed successfully");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("🔥 [MARK PICKED FATAL]", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
