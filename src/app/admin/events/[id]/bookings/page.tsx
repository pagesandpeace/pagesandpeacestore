export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { events, eventBookings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";
import { redirect } from "next/navigation";

import { Card, CardHeader } from "@/components/ui/Card";
import Link from "next/link";

export default async function AdminEventBookingsPage(props: {
  params: { id: string };
}) {
  // Next.js 15 requires awaiting params
  const { id: eventId } = await props.params;

  // 🔐 Admin-only access
  const user = await getCurrentUserServer();
  if (!user || (user.role !== "admin" && user.role !== "staff")) {
    redirect("/account");
  }

  // Fetch event
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <h1 className="text-3xl font-semibold">Event Not Found</h1>

        <Link
          href="/admin/events"
          className="text-blue-600 underline mt-4 inline-block"
        >
          Back to Events
        </Link>
      </div>
    );
  }

  // Fetch bookings
  const bookings = await db
    .select()
    .from(eventBookings)
    .where(eq(eventBookings.eventId, eventId));

  const total = bookings.length;
  const paid = bookings.filter((b) => b.paid).length;
  const cancelled = bookings.filter((b) => b.cancelled).length;

  return (
    <div className="max-w-5xl mx-auto py-12 space-y-10">
      <Link
        href={`/admin/events/${eventId}`}
        className="text-blue-600 underline"
      >
        ← Back to Event
      </Link>

      <h1 className="text-3xl font-bold">Bookings for {event.title}</h1>

      {/* SUMMARY CARD */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Summary</h2>
        </CardHeader>

        <div className="p-6 space-y-2">
          <p>
            <strong>Total:</strong> {total}
          </p>
          <p>
            <span className="text-green-700 font-semibold">{paid} paid</span>{" "}
            •{" "}
            <span className="text-red-700 font-semibold">
              {cancelled} cancelled
            </span>
          </p>
        </div>
      </Card>

      {/* BOOKINGS TABLE */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Attendees</h2>
        </CardHeader>

        <div className="p-6">
          {total === 0 ? (
            <p>No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="p-3 border-r">Name</th>
                    <th className="p-3 border-r">Email</th>
                    <th className="p-3 border-r">Payment</th>
                    <th className="p-3 border-r">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="p-3">{b.name}</td>
                      <td className="p-3">{b.email}</td>

                      <td className="p-3">
                        {b.paid ? (
                          <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-sm">
                            Paid
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-sm">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {b.cancelled ? (
                          <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-sm">
                            Cancelled
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-sm">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="p-3 space-x-4">
                        {!b.cancelled && (
                          <button
                            className="text-red-600 underline"
                            onClick={async () => {
                              const res = await fetch(
                                "/api/admin/events/cancel",
                                {
                                  method: "POST",
                                  body: JSON.stringify({ bookingId: b.id }),
                                }
                              );

                              if (res.ok) {
                                window.location.reload();
                              } else {
                                alert("Failed to cancel booking.");
                              }
                            }}
                          >
                            Cancel
                          </button>
                        )}

                        {b.paid && (
                          <button
                            className="text-green-600 underline"
                            onClick={() => alert("Mark attended coming soon")}
                          >
                            Mark Attended
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
