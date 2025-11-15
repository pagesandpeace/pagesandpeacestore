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
  try {
    const { eventId } = await req.json();

    if (!eventId)
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    // Auth
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user)
      return NextResponse.json(
        {
          error: "AUTH_REQUIRED",
          redirectTo: `/sign-in?redirect=/events/${eventId}`,
        },
        { status: 401 }
      );

    // Fetch event
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));

    if (!event)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // ⭐ Create booking before Stripe
    const bookingId = uuidv4();

    await db.insert(eventBookings).values({
      id: bookingId,
      eventId,
      userId: session.user.id,
      name: session.user.name,
      email: session.user.email,
      paid: false,
      cancelled: false,
      createdAt: new Date(),
    });

    // Stripe session
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email,
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
      metadata: {
        kind: "event",
        bookingId,
        eventId,
        userId: session.user.id,
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/events/success?bookingId=${bookingId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/events/${eventId}?cancelled=1`,
    });

    return NextResponse.json({ url: checkout.url });

  } catch (err) {
    console.error("❌ EVENT CHECKOUT ERROR", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
