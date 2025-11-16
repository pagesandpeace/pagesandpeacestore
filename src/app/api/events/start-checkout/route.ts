import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { events, eventBookings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  console.log("🔥 [EVENT CHECKOUT] Started");

  try {
    const { eventId } = await req.json();
    console.log("📌 eventId:", eventId);

    if (!eventId) {
      console.log("❌ Missing eventId");
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    // ------------------------------
    // AUTH
    // ------------------------------
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      console.log("❌ Not authenticated");
      return NextResponse.json(
        {
          error: "AUTH_REQUIRED",
          redirectTo: `/sign-in?callbackURL=/dashboard/events/${eventId}`,
        },
        { status: 401 }
      );
    }

    const user = session.user;
    console.log("👤 User:", user.id);

    // ------------------------------
    // FETCH EVENT
    // ------------------------------
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      console.log("❌ Event not found");
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    console.log("📅 Event:", event.title);

    // ------------------------------
    // CAPACITY CHECK
    // ------------------------------
    const allBookings = await db
      .select()
      .from(eventBookings)
      .where(eq(eventBookings.eventId, eventId));

    const active = allBookings.filter((b) => !b.cancelled).length;

    console.log(`🧮 Capacity: ${active}/${event.capacity}`);

    if (active >= event.capacity) {
      console.log("❌ Event sold out");
      return NextResponse.json({ error: "SOLD_OUT" }, { status: 400 });
    }

    // ------------------------------
    // GENERATE BOOKING ID
    // ------------------------------
    const bookingId = uuidv4();
    console.log("🎫 bookingId:", bookingId);

    // ------------------------------
    // CHECKOUT
    // ------------------------------
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});


    const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    console.log("🌍 BASE_URL:", BASE_URL);

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: event.pricePence,
            product_data: { name: event.title },
          },
          quantity: 1,
        },
      ],

      // STRICT metadata
      metadata: {
        kind: "event",
        eventId,
        bookingId,
        userId: user.id,
        ts: Date.now().toString(),
      },

      success_url: `${BASE_URL}/dashboard/events/${eventId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/dashboard/events/${eventId}?cancelled=1`,
    });

    console.log("✅ Checkout created:", checkout.id);

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("❌ EVENT START CHECKOUT ERROR", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
