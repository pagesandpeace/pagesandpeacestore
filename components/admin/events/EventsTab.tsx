"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import EventCard from "./EventsCard";

/* ------------------------------------------
   TYPES
------------------------------------------ */

export type AdminEvent = {
  id: string;
  title: string;
  subtitle?: string | null;
  slug: string;
  date: string;
  price_pence: number;
  image_url?: string | null;

  capacity: number;
  published: boolean;

  event_bookings?: { id: string }[] | null;
};

/* ------------------------------------------
   COMPONENT
------------------------------------------ */

export default function EventsTabs({ events }: { events: AdminEvent[] }) {
  const [active, setActive] = useState<"upcoming" | "archived">("upcoming");

  const now = new Date();

  const upcoming = events.filter(
    (e) => new Date(e.date) >= now
  );
  const archived = events.filter(
    (e) => new Date(e.date) < now
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-3 border-b pb-2">
        <Button
          variant={active === "upcoming" ? "primary" : "neutral"}
          onClick={() => setActive("upcoming")}
        >
          Upcoming ({upcoming.length})
        </Button>

        <Button
          variant={active === "archived" ? "primary" : "neutral"}
          onClick={() => setActive("archived")}
        >
          Archived ({archived.length})
        </Button>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(active === "upcoming" ? upcoming : archived).map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Empty state */}
      {(active === "upcoming" ? upcoming : archived).length === 0 && (
        <p className="text-neutral-500 italic">
          {active === "upcoming"
            ? "No upcoming events yet."
            : "No archived events."}
        </p>
      )}
    </div>
  );
}
