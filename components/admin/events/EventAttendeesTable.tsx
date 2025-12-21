"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Attendee = {
  booking_id: string;
  order_item_id: string | null;
  price: number;
  name: string;
  email: string;
  refunded: boolean;
  cancelled: boolean;
};

export default function EventAttendeesTable({
  attendees,
}: {
  attendees: Attendee[];
}) {
  const [refunding, setRefunding] = useState<string | null>(null);

  async function refundSeat(attendee: Attendee) {
    if (attendee.refunded || attendee.cancelled) return;

    setRefunding(attendee.booking_id);

    const res = await fetch("/api/admin/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: attendee.booking_id }),
    });

    if (!res.ok) {
      alert("Refund failed");
      setRefunding(null);
      return;
    }

    window.location.reload();
  }

  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold mb-4">Attendees</h2>

      <table className="w-full text-sm border">
        <thead className="bg-neutral-50">
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Price</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2" />
          </tr>
        </thead>

        <tbody>
          {attendees.map((a, i) => {
            const status = a.refunded
              ? "Refunded"
              : a.cancelled
              ? "Cancelled"
              : "Active";

            return (
              <tr key={a.booking_id} className="border-t">
                <td className="p-2">{a.name || `Guest ${i + 1}`}</td>
                <td className="p-2">{a.email || "—"}</td>
                <td className="p-2">£{a.price.toFixed(2)}</td>
                <td className="p-2">{status}</td>
                <td className="p-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    disabled={
                      a.refunded ||
                      a.cancelled ||
                      refunding === a.booking_id
                    }
                    onClick={() => refundSeat(a)}
                  >
                    Refund
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
