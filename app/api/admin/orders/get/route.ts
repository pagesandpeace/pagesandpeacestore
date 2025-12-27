import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  try {
    const supabase = await supabaseAuthServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orderId = new URL(req.url).searchParams.get("id");
    if (!orderId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          created_at,
          total,
          status,
          stripe_payment_intent_id,
          order_items (
            id,
            kind,
            name,
            quantity,
            refunded_quantity,
            refunded_amount,
            price,
            event_id
          )
        `
      )
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        ...order,
        total: Number(order.total),
        order_items: (order.order_items ?? []).map((it) => ({
          ...it,
          price: Number(it.price),
          refunded_amount:
            it.refunded_amount != null ? Number(it.refunded_amount) : null,
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
