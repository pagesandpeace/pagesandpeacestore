"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function EventsSnapshot({ events }: { events: any[] }) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>

      <ul className="space-y-2">
        {events.map((ev) => (
          <li key={ev.id} className="flex justify-between">
            <span>{ev.title}</span>

            <Link
              href={`/admin/events/${ev.id}`}
              className="text-[var(--accent)] underline"
            >
              Manage →
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
