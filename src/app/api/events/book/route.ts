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
    // ⬇️ FIXED — JSON input instead of formData()
    const { eventId } = await req.json();

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    // Get session
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Not logged in", redirectTo: "/sign-in?redirect=/events/" + eventId },
        { status: 401 }
      );
    }

    // Lookup the event
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Create booking
    const bookingId = uuidv4();

    await db.insert(eventBookings).values({
      id: bookingId,
      eventId,
      userId: session.user.id,
      name: session.user.name ?? "Guest",
      email: session.user.email,
      paid: false,
      cancelled: false,
      createdAt: new Date(),
    });

    // Create Stripe session
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: session.user.email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: event.title },
            unit_amount: event.pricePence,    // pricePence is correct
          },
          quantity: 1,
        },
      ],
      metadata: {
  kind: "event",         // <<< THIS FIXES EVERYTHING
  bookingId,
  eventId,
  userId: session.user.id,
},
success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/events/success?bookingId=${bookingId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/events/${eventId}?cancelled=1`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("❌ Event booking error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
