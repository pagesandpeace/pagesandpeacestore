import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  /* -----------------------------
     LOAD AUTH USER (BOOKER)
  ----------------------------- */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const bookerName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "You (booker)";

  /* -----------------------------
     LOAD ORDER
  ----------------------------- */
  const { data: order } = await supabase
    .from("orders")
    .select(`id, total, status, stripe_checkout_session_id`)
    .eq("id", orderId)
    .single();

  if (!order) notFound();

  /* -----------------------------
     LOAD EVENT ITEM
  ----------------------------- */
  const { data: orderItems } = await supabase
    .from("order_items")
    .select(
      `
        kind,
        quantity,
        events (
          id,
          title,
          date
        )
      `
    )
    .eq("order_id", orderId);

  const eventItem = orderItems?.find((i) => i.kind === "event");
  const rawEvent = eventItem?.events as any;
  const baseEvent = Array.isArray(rawEvent) ? rawEvent[0] : rawEvent;

  if (!baseEvent || !eventItem) notFound();

  /* -----------------------------
     LOAD FULL EVENT (SAFE)
  ----------------------------- */
  const { data: fullEvent } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      subtitle,
      short_description,
      description,
      date,
      capacity,
      price_pence,
      image_url,
      published
    `
    )
    .eq("id", baseEvent.id)
    .single();

  const event = fullEvent ?? baseEvent;

  /* -----------------------------
     LOAD SEATS (SOURCE OF TRUTH)
  ----------------------------- */
  const { data: seats } = await supabase
    .from("event_bookings")
    .select(`id, name, refunded, cancelled`)
    .eq("stripe_checkout_session_id", order.stripe_checkout_session_id)
    .order("created_at", { ascending: true });

  if (!seats || seats.length === 0) notFound();

  /* -----------------------------
     DERIVED COUNTS
  ----------------------------- */
  const totalTickets = eventItem.quantity;
  const activeTickets = seats.filter(
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
            {event.capacity && <span>👥 Capacity: {event.capacity}</span>}
            {event.price_pence && (
              <span>💷 £{(event.price_pence / 100).toFixed(2)}</span>
            )}
          </div>

          {/* 🔴 UPDATED TICKET STATUS BADGE */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm">
  🎟️{" "}
  {activeTickets === 0
    ? "All tickets refunded"
    : activeTickets === totalTickets
    ? `${totalTickets} ${totalTickets === 1 ? "ticket" : "tickets"} booked`
    : `${activeTickets} of ${totalTickets} ${
        totalTickets === 1 ? "ticket" : "tickets"
      } active`}
</div>

        </div>
      </section>

      {/* EVENT DESCRIPTION */}
      {(event.short_description || event.description) && (
        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-2">
          <h2 className="text-lg font-semibold">About this event</h2>

          {event.short_description && (
            <p className="text-sm text-neutral-700">
              {event.short_description}
            </p>
          )}

          {event.description && (
            <p className="whitespace-pre-line text-sm text-neutral-700">
              {event.description}
            </p>
          )}
        </section>
      )}

      {/* TICKETS */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Your tickets</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {seats.map((seat, idx) => {
            const isBooker = idx === 0;
            const displayName = isBooker
              ? bookerName
              : seat.name || "Guest";

            const refunded = seat.refunded || seat.cancelled;

            return (
              <div
                key={seat.id}
                className={`relative overflow-hidden rounded-xl border p-5 shadow-sm ${
                  refunded
                    ? "bg-neutral-100 opacity-60"
                    : "bg-white"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-lg">
                    🎟️
                  </div>

                  <div>
                    <p className="text-sm text-neutral-500">
                      Ticket {idx + 1}
                      {isBooker && " • Booker"}
                    </p>
                    <p className="font-medium">{displayName}</p>
                    <p className="text-xs mt-1">
                      {refunded ? "Refunded" : "Active"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* PAYMENT */}
      <section className="rounded-xl border bg-white p-6 text-sm text-neutral-700 shadow-sm">
        <h3 className="mb-2 font-medium">Payment summary</h3>
        <p><strong>Total paid:</strong> £{order.total}</p>
        <p>
          <strong>Status:</strong>{" "}
          <span className="capitalize">{order.status}</span>
        </p>
      </section>

    </main>
  );
}
