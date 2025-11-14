export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { orders, eventBookings, events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string; eid?: string };
}) {
  const sessionId = searchParams.session_id;
  const eventId = searchParams.eid;

  if (!sessionId || !eventId) {
    return (
      <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold">Missing session details</h1>
        <Link
          href="/dashboard/events"
          className="text-accent underline mt-4 inline-block"
        >
          Back to Events
        </Link>
      </main>
    );
  }

  // Fetch Stripe order
  const order = (
    await db
      .select()
      .from(orders)
      .where(eq(orders.stripeCheckoutSessionId, sessionId))
  )[0];

  // Fetch event
  const eventRow = (
    await db.select().from(events).where(eq(events.id, eventId))
  )[0];

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12">
      <div className="max-w-2xl mx-auto text-center space-y-8">

        <h1 className="text-3xl font-semibold tracking-widest text-green-700">
          Booking Confirmed 🎉
        </h1>

        <p className="text-neutral-700 text-lg">
          Thank you! Your seat has been successfully booked for:
        </p>

        <div className="bg-white border border-[#e7dfd4] rounded-xl p-6 shadow-sm space-y-3">
          <h2 className="text-2xl font-semibold">{eventRow.title}</h2>

          <p className="text-neutral-700">
            {new Date(eventRow.date).toLocaleString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <p className="text-neutral-700">
            <span className="font-semibold">Price:</span>{" "}
            £{(eventRow.pricePence / 100).toFixed(2)}
          </p>
        </div>

        {order && (
          <div className="bg-white border border-[#e7dfd4] rounded-xl p-6 shadow-sm space-y-3">
            <h3 className="text-xl font-semibold">Payment Info</h3>

            <p className="text-neutral-700">
              <span className="font-semibold">Amount Paid:</span>{" "}
              £{(order.total / 100).toFixed(2)}
            </p>

            <p className="text-neutral-700">
              <span className="font-semibold">Payment Method:</span>{" "}
              {order.stripeCardBrand
                ? `${order.stripeCardBrand} •••• ${order.stripeLast4}`
                : "—"}
            </p>

            {order.stripeReceiptUrl && (
              <a
                href={order.stripeReceiptUrl}
                target="_blank"
                className="underline text-accent font-medium"
              >
                View Stripe Receipt
              </a>
            )}
          </div>
        )}

        <Link
          href={`/dashboard/events/${eventId}`}
          className="inline-block bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
        >
          Go to Event Page
        </Link>

        <Link
          href="/dashboard/events"
          className="block text-accent underline mt-4"
        >
          Back to all events
        </Link>
      </div>
    </main>
  );
}
