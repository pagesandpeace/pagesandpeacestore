import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutItem = {
  ticketTypeId: string;
  quantity: number;
};

export async function POST(req: Request) {
  console.log("🔥 [EVENT CHECKOUT] Started");

  try {
    const body = await req.json();

    console.log(
      "📦 [EVENT CHECKOUT] Raw body:",
      JSON.stringify(body, null, 2)
    );

    const { eventId, items } = body as {
      eventId?: string;
      items?: CheckoutItem[];
    };

    if (!eventId) {
      console.error("❌ Missing eventId");
      return NextResponse.json(
        { error: "Missing eventId" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      console.error("❌ Missing items[]");
      return NextResponse.json(
        { error: "NO_ITEMS" },
        { status: 400 }
      );
    }

    /* ----------------------------------
       AUTH
    ---------------------------------- */
    const supabase = await supabaseServer();

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

    /* ----------------------------------
       FETCH EVENT
    ---------------------------------- */
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id, title, capacity, slug")
      .eq("id", eventId)
      .single();

    if (!event || eventErr) {
      console.error("❌ Event not found", eventErr);
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ----------------------------------
       LOAD TICKET TYPES
    ---------------------------------- */
    const ticketTypeIds = items.map((i) => i.ticketTypeId);

    const { data: ticketTypes, error: ticketErr } = await supabase
      .from("event_ticket_types")
      .select("id, name, price_pence, is_active")
      .eq("event_id", eventId)
      .in("id", ticketTypeIds)
      .eq("is_active", true);

    if (ticketErr || !ticketTypes || ticketTypes.length !== items.length) {
      console.error("❌ Invalid ticket types", ticketErr);
      return NextResponse.json(
        { error: "INVALID_TICKET_TYPES" },
        { status: 400 }
      );
    }

    /* ----------------------------------
       CAPACITY CHECK (EVENT LEVEL)
    ---------------------------------- */
    const totalRequested = items.reduce(
      (sum, i) => sum + Number(i.quantity || 0),
      0
    );

    if (totalRequested < 1) {
      return NextResponse.json(
        { error: "INVALID_QUANTITY" },
        { status: 400 }
      );
    }

    const { data: bookings } = await supabase
      .from("event_bookings")
      .select("cancelled")
      .eq("event_id", eventId);

    const activeBookings = (bookings ?? []).filter(
      (b) => !b.cancelled
    ).length;

    if (activeBookings + totalRequested > event.capacity) {
      console.warn("❌ Capacity exceeded", {
        activeBookings,
        requested: totalRequested,
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
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      items.map((item) => {
        const tt = ticketTypes.find(
          (t) => t.id === item.ticketTypeId
        )!;

        return {
          quantity: item.quantity,
          price_data: {
            currency: "gbp",
            unit_amount: tt.price_pence,
            product_data: {
              name: `${event.title} – ${tt.name}`,
            },
          },
        };
      });

    console.log("💳 Stripe line items:", lineItems);

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,

      line_items: lineItems,

      metadata: {
        kind: "event",
        eventId,
        userId: user.id,
        items: JSON.stringify(items), // 🔑 webhook-safe
      },

      success_url: `${BASE_URL}/events/${event.slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/events/${event.slug}?cancelled=1`,
    });

    console.log("✅ Stripe session created:", checkout.id);

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("💥 EVENT START CHECKOUT ERROR", err);
    return NextResponse.json(
      { error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
