export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { eventBookings, events } from "@/lib/db/schema";
import { getCurrentUserServer } from "@/lib/auth/actions";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StartEventCheckout } from "@/components/StartEventCheckout";

export default async function DashboardEventDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  // ⭐ FIX: Await params
  const { id: eventId } = await props.params;

  const user = await getCurrentUserServer();
  if (!user) {
    redirect(`/sign-in?callbackURL=/dashboard/events/${eventId}`);
  }

  /* --------------------------------------------------
     FETCH EVENT
  -------------------------------------------------- */
  const event = (
    await db.select().from(events).where(eq(events.id, eventId))
  )[0];

  if (!event) {
    return (
      <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold">Event Not Found</h1>
        <Link
          href="/dashboard/events"
          className="text-accent underline mt-4 inline-block"
        >
          Back to Events
        </Link>
      </main>
    );
  }

  /* --------------------------------------------------
     FETCH USER BOOKINGS (does NOT create new ones)
  -------------------------------------------------- */
  const bookings = await db
    .select()
    .from(eventBookings)
    .where(
      and(eq(eventBookings.eventId, eventId), eq(eventBookings.userId, user.id))
    );

  const formattedDate = new Date(event.date).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* HEADER */}
        <div className="space-y-2 border-b border-[#dcd6cf] pb-6">
          <h1 className="text-3xl font-semibold tracking-widest">{event.title}</h1>
          <p className="text-[#111]/70 text-sm">
            Full event details and your booking history.
          </p>
        </div>

        {/* EVENT DETAILS */}
        <section className="bg-white border border-[#e7dfd4] rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-xl font-semibold">Event Details</h2>

          <p className="text-neutral-700">
            <span className="font-semibold">Date:</span> {formattedDate}
          </p>

          <p className="text-neutral-700">
            <span className="font-semibold">Price:</span>{" "}
            £{(event.pricePence / 100).toFixed(2)}
          </p>

          <p className="text-neutral-700">
            <span className="font-semibold">Capacity:</span> {event.capacity} seats
          </p>
        </section>

        {/* USER BOOKINGS — LIST */}
        {bookings.length > 0 && (
          <section className="bg-white border border-[#e7dfd4] rounded-xl p-6 space-y-6 shadow-sm">
            <h2 className="text-xl font-semibold">Your Bookings</h2>

            <div className="space-y-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 border border-[#eee] rounded-lg bg-[#fafafa]"
                >
                  <p>
                    <span className="font-semibold">Booking ID:</span> {b.id}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span>{" "}
                    {b.cancelled ? (
                      <span className="text-red-600 font-semibold">Cancelled</span>
                    ) : (
                      <span className="text-green-600 font-semibold">Active</span>
                    )}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/events"
              className="block text-accent underline text-sm"
            >
              ← Back to Events
            </Link>
          </section>
        )}

        {/* CHECKOUT CTA */}
        <section className="bg-white border border-[#e7dfd4] rounded-xl p-6 shadow-sm space-y-6 text-center">
          <h2 className="text-xl font-semibold">
            {bookings.length > 0
              ? "Already Booked"
              : "You haven't booked this event yet"}
          </h2>

          {bookings.length > 0 ? (
            <p className="text-neutral-700">
              You already reserved a seat.
              <br />
              Want to bring a friend?
            </p>
          ) : (
            <p className="text-neutral-700">Tap below to reserve your seat.</p>
          )}

          {/* ⭐ Checkout Button (ONLY ONE ENTRYPOINT) */}
          <StartEventCheckout eventId={eventId} />

          <Link
            href="/dashboard/events"
            className="block text-accent underline text-sm mt-4"
          >
            ← Back to Events
          </Link>
        </section>
      </div>
    </main>
  );
}
