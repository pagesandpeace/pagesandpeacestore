import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublishedEvent } from "@/lib/app-core/events";
import { EventTicketPicker } from "@/components/app-core/event-ticket-picker";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPrice(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);

  if (!event) {
    return { title: "Event not found" };
  }

  return {
    title: event.title,
    description:
      event.short_description ??
      event.subtitle ??
      `Join us for ${event.title} at Pages & Peace.`,
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);

  if (!event) notFound();

  const soldOut = event.remaining_seats <= 0;

  return (
    <main className="min-h-screen bg-background pb-20 font-[Montserrat]">
      <div className="relative min-h-80 h-[48vh] w-full bg-[#e8dfd6]">
        {event.image_url ? (
          <Image
            src={event.image_url}
            alt={event.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-6 pb-10 text-white">
          <Link href="/events" className="text-sm underline underline-offset-4">
            ← All events
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            {event.title}
          </h1>
          {event.subtitle ? <p className="mt-3 text-xl text-white/90">{event.subtitle}</p> : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-12 lg:grid-cols-[1fr_20rem]">
        <article className="space-y-7 text-lg leading-relaxed text-foreground/85">
          {event.short_description ? (
            <p className="text-xl font-medium text-foreground">{event.short_description}</p>
          ) : null}
          <div>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">About this event</h2>
            <p className="whitespace-pre-line">{event.description}</p>
          </div>
        </article>

        <aside className="h-fit rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-foreground">Date &amp; time</dt>
              <dd className="mt-1 text-foreground/70">{formatEventDate(event.starts_at)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Availability</dt>
              <dd className="mt-1 text-foreground/70">
                {soldOut ? "Sold out" : `${event.remaining_seats} place${event.remaining_seats === 1 ? "" : "s"} remaining`}
              </dd>
            </div>
          </dl>

          <EventTicketPicker
            tickets={event.ticket_types.map((ticket) => ({
              id: ticket.id,
              name: ticket.name,
              price_pence: ticket.price_pence,
            }))}
            soldOut={soldOut}
          />
        </aside>
      </div>
    </main>
  );
}
