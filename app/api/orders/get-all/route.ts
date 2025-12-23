import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type OrderRow = {
  id: string;
  total: number | string;
  status: string;
  created_at: string;
  stripe_receipt_url: string | null;
  order_items: {
    quantity: number;
    price: number;
  }[] | null;
};

export async function GET() {
  const supabase = await supabaseServer();

  /* ---------------- AUTH ---------------- */
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return NextResponse.json({ orders: [] }, { status: 401 });
  }

  /* -------- FETCH USER ORDERS -------- */
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      total,
      status,
      created_at,
      stripe_receipt_url,
      order_items (
        quantity,
        price
      )
    `)
    .eq("user_id_uuid", user.id) // 🔑 FIX
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error loading orders:", error);
    return NextResponse.json({ orders: [] }, { status: 500 });
  }

  const orders = (data ?? []).map((order: OrderRow) => ({
    id: order.id,
    total: Number(order.total),
    status: order.status,
    created_at: order.created_at,
    receipt_url: order.stripe_receipt_url,
    itemCount: order.order_items?.length ?? 0,
  }));

  return NextResponse.json({ orders });
}
