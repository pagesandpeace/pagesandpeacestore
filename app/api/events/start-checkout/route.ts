import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  console.log("🔥 [EVENT CHECKOUT] Started");

  try {
    const { eventId, quantity } = await req.json();

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const ticketQty = Number(quantity ?? 1);

    if (!Number.isInteger(ticketQty) || ticketQty < 1) {
      return NextResponse.json(
        { error: "INVALID_QUANTITY" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    /* ----------------------------------
       AUTH
    ---------------------------------- */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "AUTH_REQUIRED",
          redirectTo: `/sign-in?callbackURL=/events/${eventId}`,
        },
        { status: 401 }
      );
    }

    console.log("👤 User:", user.id);
    console.log("🎟️ Quantity:", ticketQty);

    /* ----------------------------------
       FETCH EVENT
    ---------------------------------- */
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (!event || eventErr) {
      console.error("❌ Event not found", eventErr);
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    /* ----------------------------------
       CAPACITY CHECK (FIXED)
    ---------------------------------- */
    const { data: bookings } = await supabase
      .from("event_bookings")
      .select("cancelled")
      .eq("event_id", eventId);

    const activeBookings = (bookings ?? []).filter(
      (b) => !b.cancelled
    ).length;

    if (activeBookings + ticketQty > event.capacity) {
      console.warn("❌ Capacity exceeded", {
        activeBookings,
        ticketQty,
        capacity: event.capacity,
      });

      return NextResponse.json(
        { error: "NOT_ENOUGH_SEATS" },
        { status: 400 }
      );
    }

    /* ----------------------------------
       STRIPE
    ---------------------------------- */
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
    });

    const BASE_URL =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const successUrl = `${BASE_URL}/events/${event.slug}/success?session_id={CHECKOUT_SESSION_ID}`;
    console.log("✅ EVENT SUCCESS URL:", successUrl);

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,

      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: event.price_pence,
            product_data: {
              name: event.title,
            },
          },
          quantity: ticketQty, // ✅ MULTI-TICKET SUPPORT
        },
      ],

      metadata: {
        kind: "event",
        eventId,
        userId: user.id,
        quantity: String(ticketQty), // ✅ REQUIRED BY WEBHOOK
      },

      success_url: successUrl,
      cancel_url: `${BASE_URL}/events/${event.slug}?cancelled=1`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("❌ EVENT START CHECKOUT ERROR", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
