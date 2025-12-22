import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import EventAttendeesTable from "@/components/admin/events/EventAttendeesTable";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEventOverviewPage({ params }: PageProps) {
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
    .eq("id", user.id)
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

  /* -------- EVENT ORDER ITEM (PRICE SOURCE) -------- */
  const { data: eventOrderItems } = await supabase
    .from("order_items")
    .select("id, price")
    .eq("event_id", id)
    .eq("kind", "event")
    .limit(1);

  const eventOrderItem = eventOrderItems?.[0] ?? null;
  const seatPrice = Number(
    eventOrderItem?.price ?? event.price_pence / 100
  );

  /* ---------------- BOOKINGS ---------------- */
  const { data: bookings } = await supabase
    .from("event_bookings")
    .select(
      `
      id,
      name,
      email,
      refunded,
      cancelled,
      created_at
    `
    )
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  const attendees =
    bookings?.map((b) => ({
      booking_id: b.id,
      order_item_id: eventOrderItem?.id ?? null,
      price: seatPrice,
      name: b.name ?? "Guest",
      email: b.email ?? "",
      refunded: !!b.refunded,
      cancelled: !!b.cancelled,
    })) ?? [];

  /* ✅ FIX: capacity only counts ACTIVE seats */
  const activeAttendees = attendees.filter(
    (a) => !a.refunded && !a.cancelled
  ).length;

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-8">
      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <p className="text-neutral-600">
            {new Date(event.date).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-neutral-500">Capacity</p>
          <p className="font-semibold">{event.capacity}</p>
        </div>

        <div>
          <p className="text-neutral-500">Price</p>
          <p className="font-semibold">
            £{(event.price_pence / 100).toFixed(2)}
          </p>
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
          <p className="text-xs text-neutral-500">
            {attendees.length} total bookings
          </p>
        </div>
      </div>

      <EventAttendeesTable attendees={attendees} />
    </div>
  );
}
