export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { eventBookings, events, orders } from "@/lib/db/schema";
import { getCurrentUserServer } from "@/lib/auth/actions";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import BookingDetailClient from "./BookingDetailClient";

export default async function BookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id: bookingId } = await params;
  const user = await getCurrentUserServer();

  if (!user) {
    redirect(`/sign-in?callbackURL=/dashboard/bookings/${bookingId}`);
  }

  /* ----------------------------------------------------------
     FETCH BOOKING
  ---------------------------------------------------------- */
  const booking =
    (
      await db
        .select({
          id: eventBookings.id,
          eventId: eventBookings.eventId,
          name: eventBookings.name,
          email: eventBookings.email,
          paid: eventBookings.paid,
          cancelled: eventBookings.cancelled,
          cancellationRequested: eventBookings.cancellationRequested,
          refunded: eventBookings.refunded,

          // ⭐ Refund fields
          refundId: eventBookings.stripeRefundId,
          refundedAt: eventBookings.refundProcessedAt,

          stripeCheckoutSessionId: eventBookings.stripeCheckoutSessionId,
          stripePaymentIntentId: eventBookings.stripePaymentIntentId,

          createdAt: eventBookings.createdAt,
        })
        .from(eventBookings)
        .where(eq(eventBookings.id, bookingId))
    )[0];

  if (!booking) {
    return (
      <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold">Booking Not Found</h1>
        <Link href="/dashboard" className="text-accent underline mt-4 inline-block">
          Back to Dashboard
        </Link>
      </main>
    );
  }

  /* ----------------------------------------------------------
     FETCH ORDER (NULL-SAFE, DRIZZLE-CORRECT)
  ---------------------------------------------------------- */

  let order: {
    stripeReceiptUrl: string | null;
    stripeCardBrand: string | null;
    stripeLast4: string | null;
    paidAt: string | null;
  } | null = null;

  if (booking.stripeCheckoutSessionId) {
    const rows =
      await db
        .select({
          stripeReceiptUrl: orders.stripeReceiptUrl,
          stripeCardBrand: orders.stripeCardBrand,
          stripeLast4: orders.stripeLast4,
          paidAt: orders.paidAt,
        })
        .from(orders)
        .where(eq(orders.stripeCheckoutSessionId, booking.stripeCheckoutSessionId));

    order = rows[0] || null;
  }

  /* ----------------------------------------------------------
     FETCH EVENT
  ---------------------------------------------------------- */
  const event =
    (
      await db
        .select()
        .from(events)
        .where(eq(events.id, booking.eventId))
    )[0];

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-10">

        <div className="border-b pb-6">
          <h1 className="text-3xl font-semibold tracking-widest">
            Booking Details
          </h1>
        </div>

        {/* 🔥 Pass order into client component */}
        <BookingDetailClient booking={booking} event={event} order={order} />

        <Link href="/dashboard/events" className="text-accent underline text-sm">
          ← Back to My Bookings
        </Link>
      </div>
    </main>
  );
}
