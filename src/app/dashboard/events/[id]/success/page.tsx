import { db } from "@/lib/db";
import { eventBookings, events, orders } from "@/lib/db/schema";
import { getCurrentUserServer } from "@/lib/auth/actions";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const LOGO_URL =
  "https://res.cloudinary.com/dadinnds6/image/upload/v1763726107/Logo_new_update_in_green_no_background_mk3ptz.png";

export default async function SuccessPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { id: eventId } = await props.params;
  const { session_id } = await props.searchParams;

  if (!session_id) {
    return (
      <main className="min-h-screen bg-[#FAF6F1] px-6 py-14">
        <h1 className="text-xl font-semibold">Missing checkout session</h1>
        <p>Your booking succeeded but could not be verified.</p>
        <Link
          href="/dashboard/events"
          className="underline text-green-700 mt-4 inline-block"
        >
          Back to events
        </Link>
      </main>
    );
  }

  // Authenticate
  const user = await getCurrentUserServer();
  if (!user) {
    redirect(
      `/sign-in?callbackURL=/dashboard/events/${eventId}/success?session_id=${session_id}`
    );
  }

  // Wait for webhook to insert data
  await new Promise((r) => setTimeout(r, 1200));

  // Booking
  const booking =
    (
      await db
        .select()
        .from(eventBookings)
        .where(eq(eventBookings.stripeCheckoutSessionId, session_id))
        .limit(1)
    )[0] || null;

  // Order
  const order =
    (
      await db
        .select()
        .from(orders)
        .where(eq(orders.stripeCheckoutSessionId, session_id))
        .limit(1)
    )[0] || null;

  // Event
  const event =
    (
      await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1)
    )[0] || null;

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-14">

      {/* LOGO */}
      <div className="flex justify-center mb-10">
        <img
          src={LOGO_URL}
          alt="Pages & Peace Logo"
          className="h-16 opacity-95"
        />
      </div>

      {/* CONFIRMATION HEADER */}
      <div className="text-center max-w-xl mx-auto mb-12">
        <div className="bg-green-50 border border-green-200 text-green-900 p-5 rounded-lg shadow-sm mb-6">
          <h1 className="text-2xl font-bold">🎉 Booking Confirmed</h1>
          <p className="mt-1 text-neutral-700">
            You’re all set for <strong>{event?.title}</strong>.
          </p>
        </div>
      </div>

      {/* SEPARATOR */}
      <div className="border-t border-[#e7dfd4] max-w-xl mx-auto my-10" />

      {/* BOOKING DETAILS */}
      {booking && (
        <section className="max-w-xl mx-auto mb-10 space-y-2 text-neutral-700">
          <h2 className="text-xl font-semibold text-green-900 mb-2">
            Booking Details
          </h2>

          <p>
            <strong>Booking ID:</strong> {booking.id}
          </p>
          <p>
            <strong>Name:</strong> {booking.name}
          </p>
          <p>
            <strong>Email:</strong> {booking.email}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            <span className="text-green-700 font-semibold">Confirmed</span>
          </p>
        </section>
      )}

      {/* SEPARATOR */}
      <div className="border-t border-[#e7dfd4] max-w-xl mx-auto my-10" />

      {/* EVENT INFORMATION */}
      {event && (
        <section className="max-w-xl mx-auto mb-10 space-y-2 text-neutral-700">
          <h2 className="text-xl font-semibold text-green-900 mb-2">
            Event Information
          </h2>

          <p>
            <strong>Event:</strong> {event.title}
          </p>

          <p>
            <strong>Date:</strong>{" "}
            {new Date(event.date).toLocaleString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <p>
            <strong>Price:</strong> £{(event.pricePence / 100).toFixed(2)}
          </p>
        </section>
      )}

      {/* SEPARATOR */}
      <div className="border-t border-[#e7dfd4] max-w-xl mx-auto my-10" />

      {/* PAYMENT SUMMARY */}
      {order && (
        <section className="max-w-xl mx-auto mb-10 space-y-2 text-neutral-700">
          <h2 className="text-xl font-semibold text-green-900 mb-2">
            Payment Summary
          </h2>

          <p>
            <strong>Amount Paid:</strong> £{order.total}
          </p>

          <p>
            <strong>Card:</strong>{" "}
            {order.stripeCardBrand?.toUpperCase()} •••• {order.stripeLast4}
          </p>

          {order.stripeReceiptUrl && (
            <p>
              <a
                href={order.stripeReceiptUrl}
                target="_blank"
                className="underline text-green-700"
              >
                View Stripe Receipt
              </a>
            </p>
          )}
        </section>
      )}

      {/* SEPARATOR */}
      <div className="border-t border-[#e7dfd4] max-w-xl mx-auto my-10" />

      {/* ACTION BUTTONS */}
      <section className="max-w-xl mx-auto mt-12 flex flex-col items-center space-y-4">

        <Link
          href={`/dashboard/events/${eventId}`}
          className="text-green-800 underline text-lg font-medium"
        >
          View event details
        </Link>

        <Link
          href="/dashboard/events"
          className="underline text-neutral-600 text-sm"
        >
          Return to events list
        </Link>

        <Link
          href={`/dashboard/events/${eventId}`}
          className="bg-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-800 transition mt-4"
        >
          Bring a friend →
        </Link>

      </section>
    </main>
  );
}
