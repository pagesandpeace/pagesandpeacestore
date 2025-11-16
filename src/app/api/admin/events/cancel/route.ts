import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventBookings, events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing bookingId" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // FETCH BOOKING
    // ------------------------------------------------------------------
    const booking = (
      await db
        .select()
        .from(eventBookings)
        .where(eq(eventBookings.id, bookingId))
        .limit(1)
    )[0];

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------------
    // FETCH EVENT
    // ------------------------------------------------------------------
    const event = (
      await db
        .select()
        .from(events)
        .where(eq(events.id, booking.eventId))
        .limit(1)
    )[0];

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const eventDate = new Date(event.date);
    const hoursBefore = (eventDate.getTime() - now.getTime()) / 3600000;

    let status: "refunded" | "cancelled_no_refund" | "too_late";

    // ------------------------------------------------------------------
    // TOO LATE TO CANCEL (<48 hours)
    // ------------------------------------------------------------------
    if (hoursBefore < 48) {
      status = "too_late";
      return NextResponse.json({ status }, { status: 200 });
    }

    // ------------------------------------------------------------------
    // REAL STRIPE REFUND
    // ------------------------------------------------------------------
    if (booking.paid && booking.stripeCheckoutSessionId) {
      // Get Stripe checkout session → payment intent
      const session = await stripe.checkout.sessions.retrieve(
        booking.stripeCheckoutSessionId,
        { expand: ["payment_intent"] }
      );

      const pi = session.payment_intent as Stripe.PaymentIntent | null;

      if (!pi || !pi.id) {
        console.error("❌ Could not retrieve payment intent for refund.");
        return NextResponse.json(
          { error: "Unable to refund; missing payment intent." },
          { status: 500 }
        );
      }

      // Issue the refund
      await stripe.refunds.create({
        payment_intent: pi.id,
      });

      // Update booking
      await db
        .update(eventBookings)
        .set({
          cancelled: true,
          refunded: true, // ⭐ Now true because Stripe refund is real
        })
        .where(eq(eventBookings.id, bookingId));

      status = "refunded";
    } else {
      // Not paid → cancel without refund
      await db
        .update(eventBookings)
        .set({
          cancelled: true,
          refunded: false,
        })
        .where(eq(eventBookings.id, bookingId));

      status = "cancelled_no_refund";
    }

    // ------------------------------------------------------------------
    // SEND EMAIL TO CUSTOMER
    // ------------------------------------------------------------------
    if (booking.email) {
      await resend.emails.send({
        from: "Pages & Peace ☕📚 <noreply@pagesandpeace.co.uk>",
        to: booking.email,
        subject: `Your booking for "${event.title}" has been cancelled`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Booking Cancelled</h2>
            <p>Hello ${booking.name || ""},</p>

            <p>Your booking for <strong>${event.title}</strong> on
            <strong>${new Date(event.date).toLocaleString("en-GB")}</strong>
            has been cancelled.</p>

            ${
              status === "refunded"
                ? "<p>A refund has been issued through Stripe and should appear in 5–10 working days.</p>"
                : "<p>No refund was due for this booking.</p>"
            }

            <p>If you need help, reply to this email.</p>
            <br />
            <p>Warm regards,<br/>Pages & Peace ☕📚</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ status }, { status: 200 });

  } catch (err) {
    console.error("❌ Cancel booking error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
