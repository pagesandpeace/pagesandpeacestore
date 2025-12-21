import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type OrderRow = {
  id: string;
  total: string | number;
  paid_at: string | null;
  stripe_receipt_url?: string | null;
};

type ItemRow = {
  product_id: string;
  quantity: number;
  price: string | number;
  products: { name: string | null } | { name: string | null }[] | null;
};

export async function GET(req: Request) {
  try {
    const supabase = await supabaseServer();

    const sessionId = new URL(req.url).searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 }
      );
    }

    // Load order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("stripe_checkout_session_id", sessionId)
      .single<OrderRow>();

    if (orderErr || !order) {
      return NextResponse.json({
        order: null,
        status: "no-order-yet",
      });
    }

    // Load items with product join
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select(
        `
        product_id,
        quantity,
        price,
        products(name)
      `
      )
      .eq("order_id", order.id)
      .returns<ItemRow[]>();

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    const safeItems = items.map((it) => {
      const product =
        Array.isArray(it.products) ? it.products[0] : it.products;

      return {
        productId: it.product_id,
        quantity: it.quantity,
        price: Number(it.price),
        productName: product?.name ?? "Unknown Product",
      };
    });

    return NextResponse.json({
      order: {
        id: order.id,
        total: Number(order.total),
        paid_at: order.paid_at,
        stripe_receipt_url: order.stripe_receipt_url,
        items: safeItems,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
