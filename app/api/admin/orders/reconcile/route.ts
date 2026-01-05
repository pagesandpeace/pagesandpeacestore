import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* --------------------------------------------------
   Stripe
-------------------------------------------------- */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});

/* --------------------------------------------------
   Supabase (SERVICE ROLE)
-------------------------------------------------- */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* --------------------------------------------------
   Types
-------------------------------------------------- */
type Body = {
  orderId: string;
  dryRun?: boolean;
};

type PlanItem = {
  orderItemId: string;
  ticketTypeId: string;
  seatsCount: number;
};

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */
function log(message: string, data?: unknown) {
  console.log(`🛠️ RECONCILE | ${message}`, data ?? "");
}

/* --------------------------------------------------
   POST
-------------------------------------------------- */
export async function POST(req: Request) {
  log("Route hit");

  /* ---------------- AUTH ---------------- */
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

  /* ---------------- INPUT ---------------- */
  const body = (await req.json()) as Body;
  const orderId = body.orderId;
  const dryRun = body.dryRun ?? true;

  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  log("Input", { orderId, dryRun });

  /* ---------------- LOAD ORDER ---------------- */
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select(
      `
        id,
        user_id,
        user_id_uuid,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        event_seats_processed
      `
    )
    .eq("id", orderId)
    .single();

  if (!order || !order.stripe_checkout_session_id) {
    return NextResponse.json(
      { error: "Order not found or missing Stripe session" },
      { status: 404 }
    );
  }

  log("Order loaded", order);

  /* ---------------- STRIPE SESSION ---------------- */
  const session = await stripe.checkout.sessions.retrieve(
    order.stripe_checkout_session_id,
    { expand: ["customer_details"] }
  );

  const bookerName =
    session.customer_details?.name ||
    session.customer_details?.email ||
    "Booker";

  const bookerEmail = session.customer_details?.email ?? null;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : order.stripe_payment_intent_id;

  /* ---------------- ORDER ITEMS ---------------- */
  const { data: orderItemsRaw } = await supabaseAdmin
    .from("order_items")
    .select(
      "id, event_id, event_ticket_type_id, quantity, price"
    )
    .eq("order_id", order.id)
    .eq("kind", "event");

  const orderItems = orderItemsRaw ?? [];

  if (orderItems.length === 0) {
    return NextResponse.json({
      ok: true,
      dryRun,
      reconciled: true,
      expectedSeats: 0,
      existingBookings: 0,
      plan: [],
    });
  }

  /* ---------------- EXISTING BOOKINGS ---------------- */
  const orderItemIds = orderItems.map((i) => i.id);

  const { data: bookingsRaw } = await supabaseAdmin
    .from("event_bookings")
    .select("order_item_id")
    .in("order_item_id", orderItemIds);

  const bookings = bookingsRaw ?? [];

  /* ---------------- CALCULATE STATE ---------------- */
  const expectedSeats = orderItems.reduce(
    (sum, i) => sum + i.quantity,
    0
  );

  const existingSeats = bookings.length;

  const fullyReconciled = existingSeats === expectedSeats;

  log("Existing state", {
    expectedSeats,
    existingSeats,
    fullyReconciled,
  });

  /* ---------------- SHORT CIRCUIT ---------------- */
  if (fullyReconciled) {
    if (!dryRun && !order.event_seats_processed) {
      await supabaseAdmin
        .from("orders")
        .update({ event_seats_processed: true })
        .eq("id", order.id);
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      reconciled: true,
      expectedSeats,
      existingBookings: existingSeats,
      plan: [],
    });
  }

  /* ---------------- BUILD PLAN ---------------- */
  const plan: PlanItem[] = [];

  for (const item of orderItems) {
    const existingForItem = bookings.filter(
      (b) => b.order_item_id === item.id
    ).length;

    const missing = item.quantity - existingForItem;

    if (missing <= 0) continue;

    plan.push({
      orderItemId: item.id,
      ticketTypeId: item.event_ticket_type_id,
      seatsCount: missing,
    });

    if (!dryRun) {
      const seats = Array.from({ length: missing }, (_, idx) => ({
        user_id: order.user_id,
        user_id_uuid: order.user_id_uuid,
        event_id: item.event_id,
        event_ticket_type_id: item.event_ticket_type_id,
        order_item_id: item.id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        paid: true,
        cancelled: false,
        refunded: false,
        price: item.price,
        name: idx === 0 ? bookerName : `Guest ${idx + 1}`,
        email: bookerEmail,
      }));

      await supabaseAdmin.from("event_bookings").insert(seats);
    }
  }

  log("Plan/result", plan);

  /* ---------------- VERIFY + FLAG ---------------- */
  if (!dryRun) {
    const { data: finalBookings } = await supabaseAdmin
      .from("event_bookings")
      .select("id")
      .in("order_item_id", orderItemIds);

    const finalCount = finalBookings?.length ?? 0;

    if (finalCount === expectedSeats) {
      await supabaseAdmin
        .from("orders")
        .update({ event_seats_processed: true })
        .eq("id", order.id);
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    reconciled: false,
    expectedSeats,
    existingBookings: existingSeats,
    plan,
  });
}
