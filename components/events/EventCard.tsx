"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";

export type EventCardType = {
  id: string;
  slug: string;
  title: string;
  date: string;

  // ✅ UPDATED
  defaultPricePence: number | null;

  imageUrl?: string | null;
  remaining: number;

  // ✅ NEW
  bookingType: "ticketed" | "interest";
};

export default function EventCard({ event }: { event: EventCardType }) {
  const soldOut =
    event.bookingType === "ticketed" && event.remaining <= 0;

  const dateFormatted = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(event.date));

  const price =
    event.defaultPricePence !== null
      ? (event.defaultPricePence / 100).toFixed(2)
      : null;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="
        bg-white border border-[var(--accent)]/10 rounded-2xl
        shadow-sm hover:shadow-md transition-all duration-200
        overflow-hidden flex flex-col
        relative
      "
    >
      {/* IMAGE */}
      <div className="relative w-full h-56 bg-white">
        <Image
          src={event.imageUrl || "/coming_soon.svg"}
          alt={event.title}
          fill
          className={`object-cover ${soldOut ? "opacity-60" : ""}`}
        />

        {/* SOLD OUT BANNER (ticketed only) */}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-white text-xl font-bold tracking-wide uppercase">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-6 flex flex-col gap-4">
        <h3 className="text-xl font-semibold text-[var(--foreground)]">
          {event.title}
        </h3>

        <p className="text-sm text-[var(--foreground)]/70">
          {dateFormatted}
        </p>

        {/* ✅ PRICE / INTEREST SWITCH */}
        {event.bookingType === "ticketed" ? (
          <p className="text-lg font-semibold text-[var(--accent)]">
            From £{price}
          </p>
        ) : (
          <p className="text-lg font-semibold text-[var(--accent)]">
            Register interest
          </p>
        )}

        {/* ✅ AVAILABILITY */}
        {event.bookingType === "ticketed" ? (
          !soldOut ? (
            <Badge
              color={event.remaining <= 3 ? "yellow" : "green"}
              className="w-max px-3 py-1"
            >
              {event.remaining <= 3
                ? "Only a few seats left"
                : "Seats available"}
            </Badge>
          ) : (
            <Badge color="red" className="w-max px-3 py-1">
              Sold Out
            </Badge>
          )
        ) : (
          <Badge color="blue" className="w-max px-3 py-1">
            Open for interest
          </Badge>
        )}
      </div>
    </Link>
  );
}