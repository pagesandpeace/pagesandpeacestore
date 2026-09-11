import { CreditCard } from "lucide-react";

import type { EventAttendanceRow } from "@/lib/app-core/event-attendance";

export default function EventAttendanceTable({ rows }: { rows: EventAttendanceRow[] }) {
  if (!rows.length) {
    return <p className="rounded-xl border border-dashed border-black/15 px-5 py-10 text-center text-sm text-foreground/60">No active attendees yet.</p>;
  }

  return <>
    <div className="hidden overflow-hidden rounded-xl border border-black/10 bg-white md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-[#f8f5f1] text-foreground/70">
          <tr>
            <th className="px-5 py-4 font-medium">Attendee</th>
            <th className="px-5 py-4 font-medium">Email</th>
            <th className="px-5 py-4 font-medium">Ticket</th>
            <th className="px-5 py-4 font-medium">Quantity</th>
            <th className="px-5 py-4 font-medium">Channel</th>
            <th className="px-5 py-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => <tr key={row.bookingId}>
            <td className="px-5 py-4 font-medium">{row.customerName}</td>
            <td className="px-5 py-4 text-foreground/70">{row.customerEmail || "—"}</td>
            <td className="px-5 py-4 text-foreground/70">{row.ticketType}</td>
            <td className="px-5 py-4 font-medium">{row.activeQuantity}</td>
            <td className="px-5 py-4"><span className="inline-flex items-center gap-2" title="Online payment" aria-label="Online payment"><CreditCard className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Online payment</span></span></td>
            <td className="px-5 py-4"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">Confirmed</span></td>
          </tr>)}
        </tbody>
      </table>
    </div>

    <div className="space-y-3 md:hidden">
      {rows.map((row) => <article key={row.bookingId} className="rounded-xl border border-black/10 bg-white p-4">
        <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{row.customerName}</h3><p className="mt-1 break-all text-sm text-foreground/65">{row.customerEmail || "No email"}</p></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">Confirmed</span></div>
        <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-3 text-sm"><span className="text-foreground/65">{row.ticketType}</span><span className="font-semibold">{row.activeQuantity} ticket{row.activeQuantity === 1 ? "" : "s"}</span></div>
      </article>)}
    </div>
  </>;
}
