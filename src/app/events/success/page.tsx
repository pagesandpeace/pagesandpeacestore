import { db } from "@/lib/db";
import { eventBookings, events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function EventSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {

  const params = await searchParams;
  const bookingId = params.bookingId;

  if (!bookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-10">
        <div>
          <h1 className="text-3xl font-bold mb-4">Booking ID Missing</h1>
          <Link href="/events" className="text-[var(--accent)] underline">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const [booking] = await db
    .select()
    .from(eventBookings)
    .where(eq(eventBookings.id, bookingId))
    .limit(1);

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-10">
        <div>
          <h1 className="text-3xl font-bold mb-4">Booking Not Found</h1>
          <Link href="/events" className="text-[var(--accent)] underline">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, booking.eventId))
    .limit(1);

  return (
    <div className="min-h-screen bg-[#FAF6F1] flex items-center justify-center px-6">
      <div className="bg-white p-10 rounded-xl border border-[#e7dfd4] shadow-sm max-w-xl text-center space-y-6">

        <h1 className="text-3xl font-bold text-[#111]">
          Your booking is confirmed! 🎉
        </h1>

        <p className="text-lg text-neutral-700">
          Thank you for booking <strong>{event?.title}</strong>.
          <br />
          We’ve saved your ticket in your <strong>Dashboard</strong>.
        </p>

        <div className="bg-[#f6f2ec] p-6 rounded-lg text-left space-y-2">
          <p>
            <strong className="text-[#111]">Event:</strong> {event?.title}
          </p>
          <p>
            <strong className="text-[#111]">Date:</strong>{" "}
            {new Date(event!.date).toLocaleString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p>
            <strong className="text-[#111]">Booking ID:</strong> {bookingId}
          </p>
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg bg-[var(--accent)] text-white font-semibold hover:opacity-90"
          >
            Go to Dashboard
          </Link>

          <Link
            href="/events"
            className="px-6 py-3 rounded-lg bg-[#e7dfd4] text-[#111] font-semibold hover:bg-[#ded6cc]"
          >
            Browse More Events
          </Link>
        </div>
      </div>
    </div>
  );
}
