import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
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

  /* ---------------- EVENT ---------------- */
  const { data: event } = await supabase
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

  /* ---------------- TICKET TYPES ---------------- */
  const { data: ticketTypes } = await supabase
    .from("event_ticket_types")
    .select(`
      id,
      name,
      price_pence,
      is_default,
      is_active
    `)
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  /* ---------------- BOOKINGS (SEAT SOURCE OF TRUTH) ---------------- */
  const { data: bookings } = await supabase
    .from("event_bookings")
    .select(`
      id,
      name,
      email,
      price,
      refunded,
      cancelled,
      created_at
    `)
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  /* ---------------- ATTENDEES ---------------- */
  const attendees: Attendee[] =
  bookings?.map((b) => ({
    booking_id: b.id,
    order_item_id: null, // ✅ required by Attendee type
    price: Number(b.price ?? 0),
    name: b.name ?? "Guest",
    email: b.email ?? "",
    refunded: !!b.refunded,
    cancelled: !!b.cancelled,
  })) ?? [];

  const activeAttendees = attendees.filter(
    (a) => !a.refunded && !a.cancelled
  ).length;

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-10">
      {/* ---------- HEADER ---------- */}
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

      {/* ---------- STATS ---------- */}
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

        <div>
          <p className="text-neutral-500">Attendees</p>
          <p className="font-semibold">
            {activeAttendees} / {event.capacity}
          </p>
        
        </div>
      </div>

      {/* ---------- TICKET TYPES ---------- */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Ticket Types</h2>

        {!ticketTypes || ticketTypes.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No ticket types configured.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {ticketTypes.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3">
                      £{(t.price_pence / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {t.is_default ? "Default" : "Add-on"}
                    </td>
                    <td className="px-4 py-3">
                      {t.is_active ? "Active" : "Inactive"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------- ATTENDEES ---------- */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Attendees</h2>

        {activeAttendees === 0 ? (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            No attendees have booked this event yet.
          </div>
        ) : (
          <EventAttendeesTable attendees={attendees} />
        )}
      </div>
    </div>
  );
}
