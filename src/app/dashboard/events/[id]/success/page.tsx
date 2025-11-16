import { db } from "@/lib/db";
import { eventBookings, events, orders } from "@/lib/db/schema";
import { getCurrentUserServer } from "@/lib/auth/actions";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SuccessPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { id: eventId } = await props.params;
  const { session_id } = await props.searchParams;

  if (!session_id) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">Missing checkout session</h1>
        <p>Your booking was successful but we could not verify your session.</p>
        <Link href="/dashboard/events" className="underline text-blue-700 mt-4 inline-block">
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

  // Wait a moment for webhook
  await new Promise((r) => setTimeout(r, 1200));

  // -------------------------------
  // CORRECT BOOKING LOOKUP
  // -------------------------------
  const booking = (
    await db
      .select()
      .from(eventBookings)
      .where(eq(eventBookings.stripeCheckoutSessionId, session_id))
      .limit(1)
  )[0];

  // -------------------------------
  // CORRECT ORDER LOOKUP
  // -------------------------------
  const order = (
    await db
      .select()
      .from(orders)
      .where(eq(orders.stripeCheckoutSessionId, session_id))
      .limit(1)
  )[0];

  // Fetch event
  const event = (
    await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  )[0];

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-14">
      <div className="max-w-2xl mx-auto space-y-10 bg-white border border-[#e7dfd4] p-8 rounded-xl shadow-sm">

        {/* HEADER */}
        <h1 className="text-3xl font-bold tracking-wide text-center">
          🎉 Your Booking is Confirmed!
        </h1>

        <p className="text-center text-neutral-600">
          You’re all set for <strong>{event?.title}</strong>.
        </p>

        {!booking && (
          <div className="bg-red-100 text-red-700 p-4 rounded">
            Booking not found yet. Please wait or refresh.
          </div>
        )}

        {/* BOOKING DETAILS */}
        {booking && (
          <section className="space-y-4 border-b pb-6">
            <h2 className="text-xl font-semibold">Booking Details</h2>

            <p>
              <span className="font-semibold">Booking ID:</span>{" "}
              {booking.id}
            </p>

            <p>
              <span className="font-semibold">Name:</span>{" "}
              {booking.name}
            </p>

            <p>
              <span className="font-semibold">Email:</span>{" "}
              {booking.email}
            </p>

            <p>
              <span className="font-semibold">Status:</span>{" "}
              <span className="text-green-700 font-bold">Confirmed</span>
            </p>
          </section>
        )}

        {/* EVENT DETAILS */}
        {event && (
          <section className="space-y-4 border-b pb-6">
            <h2 className="text-xl font-semibold">Event Information</h2>
            <p>
              <span className="font-semibold">Event:</span> {event.title}
            </p>
            <p>
              <span className="font-semibold">Date:</span>{" "}
              {new Date(event.date).toLocaleString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p>
              <span className="font-semibold">Price:</span>{" "}
              £{(event.pricePence / 100).toFixed(2)}
            </p>
          </section>
        )}

        {/* ORDER DETAILS */}
        {order && (
          <section className="space-y-4 border-b pb-6">
            <h2 className="text-xl font-semibold">Payment Summary</h2>

            <p>
              <span className="font-semibold">Amount Paid:</span>{" "}
              £{order.total}
            </p>

            <p>
              <span className="font-semibold">Card:</span>{" "}
              {order.stripeCardBrand?.toUpperCase()} •••• {order.stripeLast4}
            </p>

            <p>
              <span className="font-semibold">Receipt:</span>{" "}
              <a
                href={order.stripeReceiptUrl ?? "#"}
                target="_blank"
                className="underline text-blue-700"
              >
                View Receipt
              </a>
            </p>
          </section>
        )}

        {/* ACTIONS */}
        <section className="text-center space-y-4">
          <Link
            href={`/dashboard/events/${eventId}`}
            className="text-accent underline text-lg block"
          >
            View event details
          </Link>

          <Link
            href={`/dashboard/events`}
            className="underline text-neutral-700 text-sm"
          >
            Return to events list
          </Link>

          <div className="pt-6">
            <Link
              href={`/dashboard/events/${eventId}`}
              className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90"
            >
              Bring a friend →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
