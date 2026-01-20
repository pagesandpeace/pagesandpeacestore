import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type MarkCollectedSource = "online" | "backorder";

type MarkCollectedBody = {
  id: string;
  source: MarkCollectedSource;
  markPaid?: boolean;
};

type BackorderUpdate = {
  collected_at: string;
  payment_status?: "paid";
};

/* ---------------------------------------------
   ADMIN CLIENT
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
  console.log("🟢 [MARK COLLECTED] route hit");

  /* ---------------- AUTH ---------------- */
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("🟢 auth user:", user?.email);

  if (!user) {
    console.error("🔴 no user");
    return NextResponse.json(
      { error: "Unauthenticated" },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    console.error("🔴 not admin");
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  /* ---------------- BODY ---------------- */
  let body: MarkCollectedBody;

  try {
    body = (await req.json()) as MarkCollectedBody;
  } catch (err) {
    console.error("🔴 failed to parse JSON body", err);
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { id, source, markPaid } = body;

  if (!id || !source) {
    return NextResponse.json(
      { error: "Missing id or source", received: body },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  /* ---------------- APPLY ---------------- */

  if (source === "online") {
    // 1️⃣ Fetch item
    const { data: item, error: fetchError } =
      await supabaseAdmin
        .from("order_items")
        .select("id, order_id, collected_at")
        .eq("id", id)
        .single();

    if (fetchError || !item) {
      return NextResponse.json(
        { error: fetchError },
        { status: 500 }
      );
    }

    // 2️⃣ Mark collected if needed
    if (!item.collected_at) {
      const { error: updateError } =
        await supabaseAdmin
          .from("order_items")
          .update({ collected_at: now })
          .eq("id", id)
          .is("collected_at", null);

      if (updateError) {
        return NextResponse.json(
          { error: updateError },
          { status: 500 }
        );
      }
    }

    // 3️⃣ Check remaining items
    const { data: remainingItems, error: remainingError } =
      await supabaseAdmin
        .from("order_items")
        .select("id")
        .eq("order_id", item.order_id)
        .eq("kind", "product")
        .is("collected_at", null);

    if (remainingError) {
      return NextResponse.json(
        { error: remainingError },
        { status: 500 }
      );
    }

    // 4️⃣ Clear ready flag if complete
    if (!remainingItems || remainingItems.length === 0) {
      const { error: orderError } =
        await supabaseAdmin
          .from("orders")
          .update({ ready_for_collection_at: null })
          .eq("id", item.order_id);

      if (orderError) {
        return NextResponse.json(
          { error: orderError },
          { status: 500 }
        );
      }
    }
  }

  if (source === "backorder") {
  // 1️⃣ Load backorder first (do NOT assume state)
  const { data: backorder, error: fetchError } =
    await supabaseAdmin
      .from("customer_backorders")
      .select("id, payment_status, collected_at")
      .eq("id", id)
      .single();

  if (fetchError || !backorder) {
    return NextResponse.json(
      { error: "Backorder not found" },
      { status: 404 }
    );
  }

  // 2️⃣ HARD STOP: unpaid backorders cannot be collected
  if (backorder.payment_status !== "paid") {
    return NextResponse.json(
      {
        error: "Cannot mark collected: payment not completed",
        payment_status: backorder.payment_status,
      },
      { status: 400 }
    );
  }

  // 3️⃣ Mark as collected (payment already confirmed)
  const { error: updateError } = await supabaseAdmin
    .from("customer_backorders")
    .update({
      collected_at: now,
    })
    .eq("id", id)
    .is("collected_at", null);

  if (updateError) {
    return NextResponse.json(
      { error: updateError },
      { status: 500 }
    );
  }
}

console.log("✅ [MARK COLLECTED] success", { id, source });
return NextResponse.json({ success: true });
}

