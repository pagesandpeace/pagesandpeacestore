import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

import EventAttendeesTable, {
  Attendee,
} from "@/components/admin/events/EventAttendeesTable";
import { Button } from "@/components/ui/Button";

type PageProps = {
  params: Promise<{ id: string }>;
};

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
      cancelled
    `)
    .eq("event_id", id);

  const ticketedAttendees: Attendee[] =
    bookings?.map((b) => ({
      booking_id: b.id,
      order_item_id: null,
      price: Number(b.price ?? 0),
      name: b.name ?? "Guest",
      email: b.email ?? "",
      refunded: !!b.refunded,
      cancelled: !!b.cancelled,
    })) ?? [];

  /* ---------------- INTEREST ---------------- */
  const { data: interest } = await admin
    .from("event_interest")
    .select("*")
    .eq("event_id", id);

  const interestAttendees: Attendee[] =
    interest?.map((i) => ({
      booking_id: i.id,
      order_item_id: null,
      price: 0,
      name: i.first_name ?? "Guest",
      email: i.email ?? "",
      refunded: false,
      cancelled: false,
      status: "interested" as const, // 🔥 NEW
    })) ?? [];

  /* ---------------- ATTENDANCE ---------------- */
  const { data: attendance } = await admin
    .from("event_attendance")
    .select("*")
    .eq("event_id", id);

  const attendanceAttendees: Attendee[] =
    attendance?.map((a) => ({
      booking_id: a.id,
      order_item_id: null,
      price: 0,
      name: a.first_name ?? "Guest",
      email: a.email ?? "",
      refunded: false,
      cancelled: false,
      status: "attending" as const, // 🔥 NEW
    })) ?? [];

  /* ---------------- FINAL ATTENDEES ---------------- */
  let attendees: Attendee[] = [];

  if (event.booking_type === "ticketed") {
    attendees = ticketedAttendees;
  } else {
    // 🔥 SHOW BOTH
    attendees = [...attendanceAttendees, ...interestAttendees];
  }

  const activeAttendees = attendees.length;

  /* ---------------- STATS ---------------- */
  const interestCount = interest?.length ?? 0;
  const attendingCount = attendance?.length ?? 0;

  /* ---------------- RENDER ---------------- */
  return (
    <div className="max-w-6xl mx-auto py-10 space-y-10">

      {/* HEADER */}
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

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-neutral-500">Capacity</p>
          <p className="font-semibold">{event.capacity}</p>
        </div>

        <div>
          <p className="text-neutral-500">Published</p>
          <p className="font-semibold">
            {event.published ? "Yes" : "No"}
          </p>
        </div>

        {event.booking_type === "ticketed" ? (
          <div>
            <p className="text-neutral-500">Attendees</p>
            <p className="font-semibold">
              {activeAttendees} / {event.capacity}
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-neutral-500">Interested</p>
              <p className="font-semibold text-blue-700">
                {interestCount}
              </p>
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

      {/* ATTENDEES TABLE */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Attendees</h2>

        {activeAttendees === 0 ? (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            No attendees yet.
          </div>
        ) : (
          <EventAttendeesTable attendees={attendees} />
        )}
      </div>
    </div>
  );
}