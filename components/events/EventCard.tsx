"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";

export type EventCardType = {
  id: string;
  slug: string;
  title: string;
  date: string;
  pricePence: number;
  imageUrl?: string | null;
  remaining: number;
};

export default function EventCard({ event }: { event: EventCardType }) {
  // ✅ Hydration-safe formatting (no locale punctuation differences)
  const dateFormatted = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(event.date));

  const price = (event.pricePence / 100).toFixed(2);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="
        bg-white border border-[var(--accent)]/10 rounded-2xl
        shadow-sm hover:shadow-md transition-all duration-200
        overflow-hidden flex flex-col
      "
    >
      {/* IMAGE */}
      <div className="relative w-full h-56 bg-white">
        <Image
          src={event.imageUrl || "/coming_soon.svg"}
          alt={event.title}
          fill
          className="object-cover"
        />
      </div>

      {/* CONTENT */}
      <div className="p-6 flex flex-col gap-4">
        <h3 className="text-xl font-semibold text-[var(--foreground)]">
          {event.title}
        </h3>

        {/* HYDRATION SAFE DATE */}
        <p className="text-sm text-[var(--foreground)]/70">{dateFormatted}</p>

        <p className="text-lg font-semibold text-[var(--accent)]">
          £{price}
        </p>

        {/* BADGE */}
        {event.remaining > 0 ? (
          <Badge
            color={event.remaining <= 3 ? "yellow" : "green"}
            className="w-max px-3 py-1"
          >
            {event.remaining <= 3 ? "Only a few seats left" : "Seats available"}
          </Badge>
        ) : (
          <Badge color="red" className="w-max px-3 py-1">
            Sold Out
          </Badge>
        )}
      </div>
    </Link>
  );
}
