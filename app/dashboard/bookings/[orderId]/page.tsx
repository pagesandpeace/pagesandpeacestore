import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/* -----------------------------
   HARD FAIL HELPER
----------------------------- */
function fail(where: string): never {
  throw new Error("BOOKING PAGE FAIL → " + where);
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await supabaseServer();

  /* -----------------------------
     AUTH
  ----------------------------- */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const bookerName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "You (booker)";

  /* -----------------------------
     ORDER
  ----------------------------- */
  const { data: order } = await supabase
    .from("orders")
    .select("id, total, status")
    .eq("id", orderId)
    .single();

  if (!order) fail("NO ORDER");

  /* -----------------------------
     EVENT ORDER ITEMS
     🔑 THIS IS REQUIRED
  ----------------------------- */
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("id, event_id")
    .eq("order_id", orderId)
    .eq("kind", "event");

  if (!orderItems || orderItems.length === 0) {
    fail("NO EVENT ORDER ITEMS");
  }

  const orderItemIds = orderItems.map((i) => i.id);
  const eventId = orderItems[0].event_id;

  /* -----------------------------
     LOAD SEATS (CORRECT)
  ----------------------------- */
  const { data: seats } = await supabase
    .from("event_bookings")
    .select(`
      id,
      name,
      refunded,
      cancelled,
      created_at,
      user_id_uuid
    `)
    .in("order_item_id", orderItemIds)
    .order("created_at", { ascending: true });

  if (!seats || seats.length === 0) {
    fail("NO SEATS");
  }

  /* -----------------------------
     EVENT
  ----------------------------- */
  const { data: event } = await supabase
    .from("events")
    .select(`
      id,
      title,
      subtitle,
      description,
      date,
      capacity,
      image_url
    `)
    .eq("id", eventId)
    .single();

  if (!event) fail("NO EVENT");

  /* -----------------------------
     SORT SEATS
     Booker first
  ----------------------------- */
  const sortedSeats = [...seats].sort((a, b) => {
    const aIsBooker = a.user_id_uuid === user.id;
    const bIsBooker = b.user_id_uuid === user.id;

    if (aIsBooker && !bIsBooker) return -1;
    if (!aIsBooker && bIsBooker) return 1;

    return (
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
    );
  });

  /* -----------------------------
     COUNTS
  ----------------------------- */
  const totalTickets = sortedSeats.length;
  const activeTickets = sortedSeats.filter(
    (s) => !s.refunded && !s.cancelled
  ).length;

  /* -----------------------------
     UI
  ----------------------------- */
  return (
    <main className="mx-auto max-w-3xl space-y-12">
      {/* EVENT HERO */}
      <section className="overflow-hidden rounded-2xl bg-neutral-900 text-white shadow">
        {event.image_url && (
          <img
            src={event.image_url}
            alt={event.title}
            className="h-56 w-full object-cover opacity-90"
          />
        )}

        <div className="space-y-3 p-8">
          <h1 className="text-3xl font-semibold">{event.title}</h1>

          {event.subtitle && (
            <p className="text-lg opacity-90">{event.subtitle}</p>
          )}

          <p className="text-sm opacity-80">
            {new Date(event.date).toLocaleString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <div className="flex flex-wrap gap-4 text-sm opacity-90">
            <span>👥 Capacity: {event.capacity}</span>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm">
            🎟️{" "}
            {activeTickets === 0
              ? "All tickets refunded"
              : `${activeTickets} ${
                  activeTickets === 1 ? "ticket" : "tickets"
                } booked`}
          </div>
        </div>
      </section>

      {/* TICKETS */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Your tickets</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {sortedSeats.map((seat, idx) => {
            const isBooker = idx === 0;
            const refunded = seat.refunded || seat.cancelled;

            const displayName =
              seat.name ||
              (isBooker ? bookerName : `Guest ${idx + 1}`);

            return (
              <div
                key={seat.id}
                className={`rounded-xl border p-5 shadow-sm ${
                  refunded ? "bg-neutral-100 opacity-60" : "bg-white"
                }`}
              >
                <p className="text-sm text-neutral-500">
                  Ticket {idx + 1}
                  {isBooker && " • Booker"}
                </p>

                <p className="font-medium">{displayName}</p>

                <p className="text-xs mt-1">
                  {refunded ? "Refunded" : "Active"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* PAYMENT */}
      <section className="rounded-xl border bg-white p-6 text-sm text-neutral-700 shadow-sm">
        <h3 className="mb-2 font-medium">Payment summary</h3>

        <p>
          <strong>Total paid:</strong> £{order.total}
        </p>

        <p>
          <strong>Status:</strong>{" "}
          <span className="capitalize">{order.status}</span>
        </p>
      </section>
    </main>
  );
}
