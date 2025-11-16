export const dynamic = "force-dynamic";
export const revalidate = 0;

import { db } from "@/lib/db";
import { events, eventBookings, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

import DeleteEventButton from "@/components/admin/DeleteEventButton";
import CancelBookingButton from "@/components/events/CancelBookingButton";
import MarkAttendedButton from "@/components/admin/MarkAttendedButton";
import { getCurrentUserServer } from "@/lib/auth/actions";

export default async function AdminEventDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  // Force dynamic params handling
  const { id: eventId } = await props.params;

  // -------------------------
  // ADMIN-GUARD (SERVER-SIDE)
  // -------------------------
  const user = await getCurrentUserServer();

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-semibold mb-4">
          Admin access required
        </h1>
        <Link href="/sign-in">
          <Button variant="primary">Sign in</Button>
        </Link>
      </div>
    );
  }

  // -------------------------
  // FETCH EVENT
  // -------------------------
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <h1 className="text-3xl font-semibold">Event Not Found</h1>

        <Link href="/admin/events">
          <Button variant="neutral" className="mt-4">
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  // -------------------------
  // FETCH BOOKINGS
  // -------------------------
  const attendees = await db
    .select()
    .from(eventBookings)
    .where(eq(eventBookings.eventId, eventId));

  const total = attendees.length;
  const paidCount = attendees.filter((a) => a.paid).length;
  const cancelledCount = attendees.filter((a) => a.cancelled).length;
  const activeBookings = attendees.filter((a) => !a.cancelled).length;
  const remainingSeats = event.capacity - activeBookings;

  // -------------------------
  // PAGE RENDER
  // -------------------------
  return (
    <div className="max-w-5xl mx-auto py-16 space-y-10">
      {/* Back Link */}
      <Link href="/admin/events">
        <Button variant="neutral" size="sm">
          ← Back to Events
        </Button>
      </Link>

      {/* Event Card */}
      <Card>
        <CardHeader className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold">{event.title}</h1>

            <p className="mt-3 text-neutral-700">
              {new Date(event.date).toLocaleString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/admin/events/${event.id}/edit`}>
              <Button variant="outline" size="sm">
                Edit Event
              </Button>
            </Link>

            <DeleteEventButton eventId={event.id} />
          </div>
        </CardHeader>

        <CardBody>
          <div className="space-y-3 text-lg">
            <p>
              <strong>Price:</strong> £{(event.pricePence / 100).toFixed(2)}
            </p>

            <p>
              <strong>Capacity:</strong> {event.capacity}
            </p>

            <p>
              <strong>Total bookings:</strong> {total}
              <span className="ml-3">
                <Badge color="green">{paidCount} paid</Badge>
              </span>
              <span className="ml-3">
                <Badge color="red">{cancelledCount} cancelled</Badge>
              </span>
            </p>

            <p>
              <strong>Remaining seats:</strong>{" "}
              {remainingSeats > 0 ? (
                <Badge color="green">{remainingSeats}</Badge>
              ) : (
                <Badge color="red">Sold Out</Badge>
              )}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Attendees Table */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold">Attendees</h2>
        </CardHeader>

        <CardBody>
          {attendees.length === 0 ? (
            <p className="text-neutral-600">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left">
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
                  {attendees.map((attendee) => (
                    <tr key={attendee.id} className="border-t">
                      <td className="p-3">{attendee.name}</td>
                      <td className="p-3">{attendee.email}</td>

                      <td className="p-3">
  {attendee.refunded ? (
    <Badge color="purple">Refunded</Badge>
  ) : attendee.paid ? (
    <Badge color="green">Paid</Badge>
  ) : (
    <Badge color="yellow">Pending</Badge>
  )}
</td>


                      <td className="p-3">
  {attendee.refunded ? (
    <Badge color="purple">Refunded</Badge>
  ) : attendee.cancelled ? (
    <Badge color="red">Cancelled</Badge>
  ) : attendee.cancellationRequested ? (
    <Badge color="yellow">Cancellation Requested</Badge>
  ) : (
    <Badge color="blue">Active</Badge>
  )}
</td>

                      <td className="p-3 space-x-3">
                        {!attendee.cancelled && !attendee.refunded && (
  <CancelBookingButton bookingId={attendee.id} />
)}
                        {attendee.paid && <MarkAttendedButton />}
                      {!attendee.cancelled && !attendee.refunded && !attendee.cancellationRequested && (
  <CancelBookingButton bookingId={attendee.id} />
)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
