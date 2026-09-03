export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { listPublishedEvents } from "@/lib/app-core/events";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function EventsPage() {
  const events = await listPublishedEvents();

  return (
    <main className="min-h-screen bg-background">
      <section className="bg-gradient-to-b from-background to-[#f5efe9] px-6 py-20 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#111]">
          Events at Pages &amp; Peace
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
          Author nights, tastings, creative workshops and more.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {events.length === 0 ? (
          <p className="text-center text-neutral-600">No upcoming events scheduled.</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <article key={event.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                {event.image_url && (
                  <img src={event.image_url} alt="" className="h-52 w-full object-cover" />
                )}
                <div className="space-y-3 p-6">
                  <p className="text-sm text-neutral-600">{formatDate(event.starts_at)}</p>
                  <h2 className="text-2xl font-bold text-neutral-950">{event.title}</h2>
                  {event.short_description && (
                    <p className="text-neutral-700">{event.short_description}</p>
                  )}
                  <p className="text-sm font-medium text-neutral-700">
                    {event.remaining_seats > 0
                      ? `${event.remaining_seats} places remaining`
                      : "Sold out"}
                  </p>
                  <Link
                    href={`/events/${event.slug}`}
                    className="inline-flex rounded-md bg-neutral-950 px-4 py-2 font-semibold text-white"
                  >
                    View event
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
