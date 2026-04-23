export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import BookNowButton from "@/components/events/BookNowButton";
import EventCTAClient from "@/components/events/EventCTAClient";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface Event {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  short_description: string | null;
  description: string | null;
  date: string;
  capacity: number;
  price_pence: number;
  image_url: string | null;
  booking_type: "ticketed" | "interest";
}

interface Params {
  slug: string;
}

interface EventCategory {
  id: string;
  name: string;
}

const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "https://pagesandpeace.co.uk";

function absoluteUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function formatEventDate(dateString: string) {
  return new Date(dateString).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getEventBySlug(slug: string): Promise<Event | null> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single<Event>();

  if (error || !data) return null;
  return data;
}

export async function generateMetadata(
  props: { params: Promise<Params> },
  parent: Promise<Metadata>
): Promise<Metadata> {
  const { slug } = await props.params;
  const event = await getEventBySlug(slug);
  const parentMetadata = await parent;

  if (!event) {
    return {
      title: "Event Not Found",
      description: "This event could not be found.",
    };
  }

  const title = event.title;
  const description =
    event.short_description ||
    event.subtitle ||
    `Join us for ${event.title} at Pages & Peace.`;

  const pageUrl = `${SITE_URL}/events/${event.slug}`;

  const eventImage = absoluteUrl(event.image_url);
  const fallbackImages = parentMetadata.openGraph?.images || [];
  const fallbackTwitterImages = parentMetadata.twitter?.images || [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Pages & Peace",
      type: "article",
      images: eventImage
        ? [
            {
              url: eventImage,
              width: 1200,
              height: 630,
              alt: event.title,
            },
          ]
        : fallbackImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: eventImage ? [eventImage] : fallbackTwitterImages,
    },
  };
}

export default async function EventDetailPage(props: { params: Promise<Params> }) {
  const { slug } = await props.params;

  const supabase = await supabaseServer();

  /* ------------------------ EVENT ------------------------ */
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single<Event>();

  if (!event || eventErr) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Event Not Found
          </h1>
          <Link href="/events" className="text-accent underline">
            ← Back to Events
          </Link>
        </div>
      </main>
    );
  }

  const eventId = event.id;

  /* ---------------------- USER ---------------------- */
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  /* ---------------------- ADMIN CLIENT ---------------------- */
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  /* ---------------------- USER STATE ---------------------- */
  let isInterested = false;
  let isAttending = false;

  if (user) {
    const [{ data: interestRows }, { data: attendanceRows }] =
      await Promise.all([
        supabaseAdmin
          .from("event_interest")
          .select("id")
          .eq("event_id", eventId)
          .eq("user_id", user.id)
          .limit(1),

        supabaseAdmin
          .from("event_attendance")
          .select("id")
          .eq("event_id", eventId)
          .eq("user_id", user.id)
          .limit(1),
      ]);

    isAttending = !!attendanceRows?.length;
    isInterested = !!interestRows?.length;
  }

  /* -------------------- CATEGORIES -------------------- */
  const { data: categoryLinksRaw } = await supabase
    .from("event_category_links")
    .select("category_id")
    .eq("event_id", eventId);

  const categoryIds = categoryLinksRaw?.map((c) => c.category_id) ?? [];

  let categories: EventCategory[] = [];
  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from("event_categories")
      .select("*")
      .in("id", categoryIds);

    categories = cats ?? [];
  }

  /* ---------------------- CAPACITY ---------------------- */
  const { data: paidSeats } = await supabaseAdmin
    .from("event_bookings")
    .select("id")
    .eq("event_id", eventId)
    .eq("paid", true)
    .eq("cancelled", false);

  const usedSeats = paidSeats?.length ?? 0;
  const remainingSeats = event.capacity - usedSeats;

  const soldOut =
    event.booking_type === "ticketed" && remainingSeats <= 0;

  const formattedDate = formatEventDate(event.date);

  /* ---------------------- UI ---------------------- */
  return (
    <main className="bg-background min-h-screen pb-20 font-[Montserrat]">
      <div className="relative w-full h-[55vh] min-h-80">
        <Image
          src={event.image_url || "/coming_soon.svg"}
          alt={event.title}
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <h1 className="absolute bottom-8 left-8 text-white text-4xl font-extrabold drop-shadow-xl tracking-tight">
          {event.title}
        </h1>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-12 space-y-10">
        {event.subtitle && (
          <p className="text-xl text-foreground/80 italic text-center">
            {event.subtitle}
          </p>
        )}

        {event.short_description && (
          <p className="text-center text-foreground/80 text-lg leading-relaxed max-w-2xl mx-auto">
            {event.short_description}
          </p>
        )}

        {categories.length > 0 && (
          <section className="bg-white border border-accent/10 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              Categories
            </h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Badge key={c.id} color="yellow">
                  {c.name}
                </Badge>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-6 text-foreground/90 text-lg">
          <div className="border-b border-muted pb-4">
            <strong>Date & Time</strong>
            <div>{formattedDate}</div>
          </div>

          <div className="border-b border-muted pb-4">
            <strong>Availability</strong>
            <div>
              {event.booking_type === "ticketed"
                ? soldOut
                  ? "Sold Out"
                  : "Seats available"
                : "Open for interest"}
            </div>
          </div>

          {event.description && (
            <div>
              <strong>About This Event</strong>
              <p className="whitespace-pre-line">{event.description}</p>
            </div>
          )}
        </section>

        <section className="bg-white border rounded-2xl shadow-sm p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            {event.booking_type === "ticketed"
              ? "Book Your Place"
              : "Register Your Interest"}
          </h2>

          {event.booking_type === "ticketed" ? (
            soldOut ? (
              <Button disabled className="w-full">
                Sold Out
              </Button>
            ) : (
              <BookNowButton
                eventId={event.id}
                slug={event.slug}
                remainingSeats={remainingSeats}
              />
            )
          ) : (
            <EventCTAClient
              eventId={event.id}
              initialInterested={isInterested}
              initialAttending={isAttending}
            />
          )}

          <Link
            href="/legal/event-booking-terms"
            className="mt-4 block text-accent underline text-sm"
          >
            Booking Terms & Conditions
          </Link>
        </section>
      </div>
    </main>
  );
}