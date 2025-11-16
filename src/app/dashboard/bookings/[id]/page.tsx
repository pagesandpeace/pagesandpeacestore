export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { eventBookings, events } from "@/lib/db/schema";
import { getCurrentUserServer } from "@/lib/auth/actions";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import BookingDetailClient from "./BookingDetailClient";

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const bookingId = params.id;
  const user = await getCurrentUserServer();

  if (!user) redirect(`/sign-in?callbackURL=/dashboard/bookings/${bookingId}`);

  const booking =
    (
      await db
        .select()
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

  const event =
    (
      await db.select().from(events).where(eq(events.id, booking.eventId))
    )[0];

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-10">

        <div className="border-b pb-6">
          <h1 className="text-3xl font-semibold tracking-widest">Booking Details</h1>
        </div>

        {/* 🔥 Client component handles all live updating */}
        <BookingDetailClient booking={booking} event={event} />

        <Link href="/dashboard/events" className="text-accent underline text-sm">
          ← Back to My Bookings
        </Link>
      </div>
    </main>
  );
}
