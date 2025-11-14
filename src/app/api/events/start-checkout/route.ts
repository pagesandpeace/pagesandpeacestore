import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { eventBookings, events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // ⭐ Correct BetterAuth signature for YOUR VERSION
    const session = await auth.api.getSession({
      headers: req.headers
    });

    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    const { eventId } = await req.json();

    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));

    if (!event) {
      return NextResponse.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });
    }

    const bookingId = uuidv4();

    await db.insert(eventBookings).values({
      id: bookingId,
      eventId: event.id,
      userId: user.id,
      paid: false,
      cancelled: false
    });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-10-29.clover",
    });

    const sessionStripe = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: event.title },
            unit_amount: event.pricePence,
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: "event",
        bookingId,
        eventId: event.id,
        userId: user.id,
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/events/${eventId}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/events/${eventId}?cancelled=1`,
    });

    return NextResponse.json({ url: sessionStripe.url });
  } catch (err) {
    console.error("❌ EVENT CHECKOUT ERROR", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
