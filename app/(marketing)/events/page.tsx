export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { formatLondonDateTime } from "@/lib/time/london";
import { listPublishedEvents } from "@/lib/app-core/events";
import { listPublicEventSeries } from "@/lib/app-core/event-series";

function formatDate(value: string) {
  return formatLondonDateTime(value, {
    weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function EventsPage() {
  const [events, series] = await Promise.all([
    listPublishedEvents(),
    listPublicEventSeries(),
  ]);

  const upcomingSeriesIds = new Set(
    events.map((event) => event.series_id).filter((id): id is string => Boolean(id)),
  );
  const activeSeries = series.filter((item) => upcomingSeriesIds.has(item.id));

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

      <section className="mx-auto max-w-7xl px-6 pt-10">
        {activeSeries.length > 0 ? (
          <div className="rounded-2xl border border-black/10 bg-[#f8f5f1] p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-neutral-500">Returning favourite?</p>
              <h2 className="mt-1 text-2xl font-bold text-neutral-950">Browse event series</h2>
              <p className="mt-1 text-sm text-neutral-600">See all available dates for the events you already know and love.</p>
            </div>
            <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
              {activeSeries.map((item) => (
                <Link
                  key={item.id}
                  href={`/events/${item.slug}`}
                  className="shrink-0 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {item.name} <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
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
