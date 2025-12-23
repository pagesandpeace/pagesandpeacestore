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
};

type ItemRow = {
  quantity: number;
  price: string | number;
  name: string | null;
};

export async function GET(req: Request) {
  try {
    const supabase = await supabaseServer();

    /* ---------------- AUTH ---------------- */
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const orderId = new URL(req.url).searchParams.get("id");
    if (!orderId) {
      return NextResponse.json(
        { error: "Missing id" },
        { status: 400 }
      );
    }

    /* -------- LOAD ORDER (OWNERSHIP SAFE) -------- */
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id_uuid", user.id)
      .single<OrderRow>();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    /* -------- LOAD ITEMS (NO JOINS) -------- */
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select(`
        quantity,
        price,
        name
      `)
      .eq("order_id", orderId)
      .returns<ItemRow[]>();

    if (itemsErr) {
      return NextResponse.json(
        { error: itemsErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      order: {
        ...order,
        total: Number(order.total),
        items: (items ?? []).map((it) => ({
          productName: it.name ?? "Unknown Item",
          quantity: it.quantity,
          price: Number(it.price),
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
