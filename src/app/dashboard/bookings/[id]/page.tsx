export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { eventBookings, events } from "@/lib/db/schema";
import { getCurrentUserServer } from "@/lib/auth/actions";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function BookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const bookingId = params.id;
  const user = await getCurrentUserServer();

  if (!user) redirect(`/sign-in?callbackURL=/dashboard/bookings/${bookingId}`);

  // Fetch booking
  const booking = (
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

  // Fetch event
  const event = (
    await db.select().from(events).where(eq(events.id, booking.eventId))
  )[0];

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-10">

        <div className="border-b pb-6">
          <h1 className="text-3xl font-semibold tracking-widest">
            Booking Details
          </h1>
        </div>

        <section className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <p>
            <strong>Booking ID:</strong> {booking.id}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            {booking.cancelled ? (
              <span className="text-red-600 font-semibold">Cancelled</span>
            ) : (
              <span className="text-green-600 font-semibold">Active</span>
            )}
          </p>

          <p>
            <strong>Paid:</strong>{" "}
            {booking.paid ? (
              <span className="text-green-600 font-semibold">Paid</span>
            ) : (
              <span className="text-orange-600 font-semibold">Not Paid</span>
            )}
          </p>

          {event && (
            <div className="pt-4 border-t space-y-2">
              <h3 className="text-lg font-semibold">Event Info</h3>
              <p><strong>Title:</strong> {event.title}</p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(event.date).toLocaleString("en-GB")}
              </p>
              <p>
                <strong>Price:</strong>{" "}
                £{(event.pricePence / 100).toFixed(2)}
              </p>
            </div>
          )}

          {/* ----------------------------------------------
               ACTION BUTTONS (conditional)
          ------------------------------------------------ */}
          <div className="pt-6 flex gap-4">

            {/* CANCEL BUTTON */}
            {booking.cancelled ? (
              <button
                disabled
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-100 border border-red-200 text-red-300 cursor-not-allowed"
              >
                Already Cancelled
              </button>
            ) : (
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-100 border border-red-300 text-red-700 hover:bg-red-200"
              >
                Cancel Booking
              </button>
            )}

            {/* CONTACT BUTTON */}
            <a
              href={`mailto:info@pagesandpeace.co.uk?subject=Event%20Booking%20Help:%20${encodeURIComponent(
                event?.title ?? ""
              )}`}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#eee] hover:bg-[#ddd] transition"
            >
              Contact Pages & Peace
            </a>
          </div>
        </section>

        <Link href="/dashboard/bookings" className="text-accent underline text-sm">
          ← Back to My Bookings
        </Link>
      </div>
    </main>
  );
}
