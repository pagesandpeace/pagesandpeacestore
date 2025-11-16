import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, eventBookings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { auth } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const eventId = params.id;

  // Check auth
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const user = session.user;
  const userId = user.id;

  // Fetch event
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Capacity check
  const allBookings = await db
    .select()
    .from(eventBookings)
    .where(eq(eventBookings.eventId, eventId));

  const active = allBookings.filter(b => !b.cancelled).length;

  if (active >= event.capacity) {
    return NextResponse.json({ error: "Sold out" }, { status: 400 });
  }

  // ⭐ THIS IS THE MISSING PIECE (pre-fills Stripe email + nicer layout)
  const customerEmail = user.email;

  // Create Stripe checkout session
  const sessionStripe = await stripe.checkout.sessions.create({
    mode: "payment",

    customer_email: customerEmail, // <----- ⭐ IMPORTANT

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

    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}//dashboard/events/[id]/success?session_id={CHECKOUT_SESSION_ID}&eid=${eventId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/events/${eventId}`,

    metadata: {
      eventId,
      userId,
    },
  });

  return NextResponse.json({ url: sessionStripe.url });
}
