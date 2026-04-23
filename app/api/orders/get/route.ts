import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type OrderRow = {
  id: string;
  total: string | number;
  status: string;
  created_at: string;
  stripe_receipt_url?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_card_brand?: string | null;
  stripe_last4?: string | null;
  paid_at?: string | null;

  refunded_amount?: string | number | null;
  refund_processed_at?: string | null;
};

type ItemRow = {
  id: string;
  kind: string | null; // ✅ ADDED
  quantity: number;
  price: string | number;
  name: string | null;
  refunded_quantity?: number | null;
  refunded_amount?: string | number | null;
};

export async function GET(req: Request) {
  try {
    const supabase = await supabaseServer();

    /* ---------------- AUTH ---------------- */
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderId = new URL(req.url).searchParams.get("id");

    if (!orderId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    /* -------- LOAD ORDER (OWNERSHIP SAFE) -------- */
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id_uuid", user.id)
      .single<OrderRow>();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    /* -------- LOAD ITEMS (UPDATED) -------- */
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select(
        `
          id,
          kind,
          quantity,
          price,
          name,
          refunded_quantity,
          refunded_amount
        `
      )
      .eq("order_id", orderId)
      .returns<ItemRow[]>();

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    /* -------- RESPONSE -------- */
    return NextResponse.json({
      order: {
        ...order,
        total: Number(order.total),
        refunded_amount:
          order.refunded_amount != null
            ? Number(order.refunded_amount)
            : null,
        items: (items ?? []).map((it) => ({
          id: it.id, // ✅ ADDED
          kind: it.kind, // ✅ ADDED
          productName: it.name ?? "Unknown Item",
          quantity: it.quantity,
          price: Number(it.price),
          refunded_quantity: it.refunded_quantity ?? 0,
          refunded_amount:
            it.refunded_amount != null
              ? Number(it.refunded_amount)
              : 0,
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}