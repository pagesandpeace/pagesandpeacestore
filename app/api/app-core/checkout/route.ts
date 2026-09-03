import { NextResponse } from "next/server";
import Stripe from "stripe";

import { appCoreDb } from "@/lib/app-core/service";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BasketItem = { ticketTypeId?: unknown; quantity?: unknown };

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

function validItems(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) return null;
  const items = value.map((item: BasketItem) => ({
    ticketTypeId: typeof item.ticketTypeId === "string" ? item.ticketTypeId : "",
    quantity: Number(item.quantity),
  }));
  if (items.some((item) => !/^[0-9a-f-]{36}$/i.test(item.ticketTypeId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) return null;
  return items;
}

export async function POST(request: Request) {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  let body: { items?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const items = validItems(body.items);
  if (!items) {
    return NextResponse.json({ error: "INVALID_BASKET" }, { status: 400 });
  }

  const db = appCoreDb();
  const { data: reservation, error: reservationError } = await db.rpc("reserve_event_checkout", {
    p_auth_user_id: user.id,
    p_items: items,
  }).single();

  if (reservationError || !reservation) {
    const message = reservationError?.message === "NOT_ENOUGH_SEATS" ? "NOT_ENOUGH_SEATS" : "CHECKOUT_UNAVAILABLE";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  try {
    const checkout = await stripeClient().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: reservation.line_items.map((item: { item_name: string; quantity: number; unit_amount_pence: number }) => ({
        quantity: item.quantity,
        price_data: {
          currency: "gbp",
          unit_amount: item.unit_amount_pence,
          product_data: { name: item.item_name },
        },
      })),
      metadata: { app_core_order_id: reservation.order_id },
      success_url: `${origin}/events/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/events?checkout=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    if (!checkout.url) throw new Error("Checkout URL missing");

    const { error: updateError } = await db
      .from("orders")
      .update({ stripe_checkout_session_id: checkout.id })
      .eq("id", reservation.order_id)
      .eq("status", "pending");

    if (updateError) throw new Error("Order could not be linked to checkout");

    return NextResponse.json({ url: checkout.url });
  } catch {
    await db.from("orders").update({ status: "cancelled" }).eq("id", reservation.order_id).eq("status", "pending");
    await db.from("bookings").update({ status: "cancelled" }).in("order_line_id",
      (await db.from("order_lines").select("id").eq("order_id", reservation.order_id)).data?.map((line) => line.id) ?? []
    );
    return NextResponse.json({ error: "CHECKOUT_UNAVAILABLE" }, { status: 503 });
  }
}
