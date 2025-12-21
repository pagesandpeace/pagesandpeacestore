"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

type Event = {
  id: string;
  title: string;
  subtitle?: string | null;
  date: string;
  capacity: number;
  price_pence: number;
  published: boolean;
  event_bookings?: { id: string }[] | null;
};

type EventCardProps = {
  event: Event;
};

export default function EventCard({ event }: EventCardProps) {
  const seatsBooked = event.event_bookings?.length ?? 0;
  const seatsLeft = event.capacity - seatsBooked;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{event.title}</h3>

            {event.subtitle && (
              <p className="text-sm text-neutral-600">{event.subtitle}</p>
            )}
          </div>

          <span
            className={`text-xs px-2 py-1 rounded-full ${
              event.published
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {event.published ? "Published" : "Draft"}
          </span>
        </div>
      </CardHeader>

      <CardBody className="space-y-3">
        <p className="text-sm text-neutral-700">
          {new Date(event.date).toLocaleString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        <p className="text-sm text-neutral-800">
          Price:{" "}
          <strong>£{(event.price_pence / 100).toFixed(2)}</strong>
        </p>

        <p className="text-sm text-neutral-800">
          Capacity: {seatsBooked}/{event.capacity}{" "}
          {seatsLeft <= 2 && seatsLeft > 0 && (
            <span className="text-orange-600 font-medium">(Low)</span>
          )}
          {seatsLeft <= 0 && (
            <span className="text-red-600 font-medium">(Full)</span>
          )}
        </p>

        <div className="flex gap-3 pt-3">
          <Link href={`/admin/events/${event.id}`}>
            <Button variant="primary">View / Edit</Button>
          </Link>

          <Button variant="outline">Duplicate</Button>
        </div>
      </CardBody>
    </Card>
  );
}
