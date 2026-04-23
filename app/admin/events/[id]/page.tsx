import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

import EventAttendeesTable, {
  Attendee,
  AttendeeGroup,
} from "@/components/admin/events/EventAttendeesTable";
import { Button } from "@/components/ui/Button";

type PageProps = {
  params: Promise<{ id: string }>;
};

function buildTicketedGroups(attendees: Attendee[]): AttendeeGroup[] {
  const groups = new Map<string, AttendeeGroup>();

  for (const attendee of attendees) {
    const fallbackKey = `${attendee.email || "no-email"}::${attendee.name || "guest"}`;
    const groupKey =
      attendee.order_item_id ||
      fallbackKey;

    const existing = groups.get(groupKey);

    if (!existing) {
      groups.set(groupKey, {
        group_id: groupKey,
        primary_name: attendee.name || "Guest",
        primary_email: attendee.email || "",
        ticket_count: 1,
        total_paid: Number(attendee.price || 0),
        refunded_total: attendee.refunded ? Number(attendee.price || 0) : 0,
        status: attendee.refunded
          ? "partially_refunded"
          : attendee.cancelled
          ? "cancelled"
          : "active",
        attendees: [attendee],
      });
    } else {
      existing.ticket_count += 1;
      existing.total_paid += Number(attendee.price || 0);

      if (attendee.refunded) {
        existing.refunded_total += Number(attendee.price || 0);
      }

      existing.attendees.push(attendee);
    }
  }

  return Array.from(groups.values()).map((group) => {
    const total = group.attendees.length;
    const refundedCount = group.attendees.filter((a) => a.refunded).length;
    const cancelledCount = group.attendees.filter((a) => a.cancelled).length;

    let status: AttendeeGroup["status"] = "active";

    if (cancelledCount === total && refundedCount === 0) {
      status = "cancelled";
    } else if (refundedCount === total) {
      status = "refunded";
    } else if (refundedCount > 0) {
      status = "partially_refunded";
    }

    return {
      ...group,
      status,
      attendees: group.attendees.sort((a, b) => a.name.localeCompare(b.name)),
    };
  });
}

export default async function AdminEventOverviewPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await supabaseServer();

  /* ---------------- AUTH ---------------- */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?callbackURL=/admin/events");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  /* ---------------- ADMIN CLIENT ---------------- */
  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  /* ---------------- EVENT ---------------- */
  const { data: event } = await admin
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <h1 className="text-3xl font-bold">Event not found</h1>
      </div>
    );
  }

  /* ---------------- BOOKINGS (TICKETED) ---------------- */
  const { data: bookings } = await admin
    .from("event_bookings")
    .select(`
      id,
      name,
      email,
      price,
      refunded,
      cancelled,
      order_item_id
    `)
    .eq("event_id", id);

  const ticketedAttendees: Attendee[] =
    bookings?.map((b) => ({
      booking_id: b.id,
      order_item_id: b.order_item_id ?? null,
      price: Number(b.price ?? 0),
      name: b.name ?? "Guest",
      email: b.email ?? "",
      refunded: !!b.refunded,
      cancelled: !!b.cancelled,
    })) ?? [];

  const groupedTicketedAttendees = buildTicketedGroups(ticketedAttendees);

  /* ---------------- INTEREST ---------------- */
  const { data: interest } = await admin
    .from("event_interest")
    .select("*")
    .eq("event_id", id);

  /* ---------------- ATTENDANCE ---------------- */
  const { data: attendance } = await admin
    .from("event_attendance")
    .select("*")
    .eq("event_id", id);

  const activeAttendees =
    event.booking_type === "ticketed"
      ? groupedTicketedAttendees.reduce((sum, group) => sum + group.ticket_count, 0)
      : (attendance?.length ?? 0) + (interest?.length ?? 0);

  /* ---------------- STATS ---------------- */
  const interestCount = interest?.length ?? 0;
  const attendingCount = attendance?.length ?? 0;

  /* ---------------- RENDER ---------------- */
  return (
    <div className="max-w-6xl mx-auto py-10 space-y-10">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <p className="text-neutral-600">
            {new Date(event.date).toLocaleString()}
          </p>
        </div>

        <Link href={`/admin/events/${event.id}/edit`}>
          <Button variant="primary">Edit Event</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-neutral-500">Capacity</p>
          <p className="font-semibold">{event.capacity}</p>
        </div>

        <div>
          <p className="text-neutral-500">Published</p>
          <p className="font-semibold">{event.published ? "Yes" : "No"}</p>
        </div>

        {event.booking_type === "ticketed" ? (
          <>
            <div>
              <p className="text-neutral-500">Tickets</p>
              <p className="font-semibold">
                {activeAttendees} / {event.capacity}
              </p>
            </div>

            <div>
              <p className="text-neutral-500">Bookings</p>
              <p className="font-semibold">
                {groupedTicketedAttendees.length}
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-neutral-500">Interested</p>
              <p className="font-semibold text-blue-700">{interestCount}</p>
            </div>

            <div>
              <p className="text-neutral-500">Attending</p>
              <p className="font-semibold text-green-700">
                {attendingCount} / {event.capacity}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {event.booking_type === "ticketed" ? "Bookings" : "Attendees"}
        </h2>

        {event.booking_type === "ticketed" ? (
          groupedTicketedAttendees.length === 0 ? (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              No attendees yet.
            </div>
          ) : (
            <EventAttendeesTable groups={groupedTicketedAttendees} />
          )
        ) : activeAttendees === 0 ? (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            No attendees yet.
          </div>
        ) : (
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            Grouped ticket view is only used for ticketed events. Interest and attendance
            events are still shown through their existing workflow.
          </div>
        )}
      </div>
    </div>
  );
}