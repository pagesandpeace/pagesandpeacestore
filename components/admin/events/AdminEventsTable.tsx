import Link from "next/link";
import Image from "next/image";

import { TableSurface } from "@/components/table/TableSurface";
import { Table } from "@/components/table/Table";
import { TableHead } from "@/components/table/TableHead";
import { TableBody } from "@/components/table/TableBody";
import { TableRow } from "@/components/table/TableRow";
import { HeadCell } from "@/components/table/HeadCell";
import { Cell } from "@/components/table/Cell";
import { Button } from "@/components/ui/Button";

type EventRow = {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  date: string;
  price_pence: number;
  image_url: string | null;
  capacity: number;
  published: boolean;

  booking_type: "ticketed" | "interest";

  event_bookings: { id: string }[];

  interest_count?: number;
  attending_count?: number; // ✅ ADD THIS
};

type Props = {
  events: EventRow[];
};

export default function AdminEventsTable({ events }: Props) {
  return (
    <TableSurface>
      <Table>
        <TableHead>
          <tr>
            <HeadCell>Event</HeadCell>
            <HeadCell>Date</HeadCell>
            <HeadCell>Bookings</HeadCell>
            <HeadCell>Status</HeadCell>
            <HeadCell>{" "}</HeadCell>
          </tr>
        </TableHead>

        <TableBody>
          {events.length === 0 ? (
            <TableRow>
              <Cell>
                <span className="text-neutral-600">
                  No events found.
                </span>
              </Cell>
              <Cell>{" "}</Cell>
              <Cell>{" "}</Cell>
              <Cell>{" "}</Cell>
              <Cell>{" "}</Cell>
            </TableRow>
          ) : (
            events.map((event) => {
              const booked = event.event_bookings.length;
              const remaining = Math.max(
                event.capacity - booked,
                0
              );

              const interestCount = event.interest_count ?? 0;

              return (
                <TableRow key={event.id}>
                  {/* EVENT SUMMARY */}
                  <Cell>
                    <div className="flex gap-4">
                      {event.image_url && (
                        <Image
                          src={event.image_url}
                          alt={event.title}
                          width={64}
                          height={64}
                          className="rounded object-cover"
                        />
                      )}

                      <div>
                        <div className="font-medium">
                          {event.title}
                        </div>

                        {event.subtitle && (
                          <div className="text-sm text-foreground/60">
                            {event.subtitle}
                          </div>
                        )}

                        <div className="text-xs text-foreground/50 mt-1">
                          £{(event.price_pence / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </Cell>

                  {/* DATE */}
                  <Cell>
                    {new Date(event.date).toLocaleDateString(
                      "en-GB",
                      {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </Cell>

                  {/* BOOKINGS / INTEREST */}
                  <Cell>
  {event.booking_type === "ticketed" ? (
    <>
      <div className="text-sm font-medium">
        {event.event_bookings.length} / {event.capacity}
      </div>

      <div className="text-xs text-foreground/60">
        {Math.max(event.capacity - event.event_bookings.length, 0)} remaining
      </div>
    </>
  ) : (
    <>
      <div className="text-sm font-medium text-blue-700">
        🔥 {event.interest_count ?? 0} interested
      </div>

      <div className="text-sm font-medium text-green-700">
        ✅ {event.attending_count ?? 0} attending
      </div>
    </>
  )}
</Cell>

                  {/* STATUS */}
                  <Cell>
                    {event.published ? "Published" : "Draft"}
                  </Cell>

                  {/* ACTIONS */}
                  <Cell>
                    <Link href={`/admin/events/${event.id}`}>
                      <Button size="sm" variant="neutral">
                        Manage
                      </Button>
                    </Link>
                  </Cell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableSurface>
  );
}