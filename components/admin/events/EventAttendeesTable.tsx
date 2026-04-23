"use client";

import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

export type Attendee = {
  booking_id: string;
  order_item_id: string | null;
  price: number;
  name: string;
  email: string;
  refunded: boolean;
  cancelled: boolean;
};

export type AttendeeGroup = {
  group_id: string;
  primary_name: string;
  primary_email: string;
  ticket_count: number;
  total_paid: number;
  refunded_total: number;
  status: "active" | "partially_refunded" | "refunded" | "cancelled";
  attendees: Attendee[];
};

type RefundReason =
  | "customer_requested_cancellation"
  | "duplicate_booking"
  | "admin_error"
  | "event_cancelled"
  | "goodwill"
  | "other";

const REFUND_REASON_OPTIONS: { value: RefundReason; label: string }[] = [
  {
    value: "customer_requested_cancellation",
    label: "Customer requested cancellation",
  },
  { value: "duplicate_booking", label: "Duplicate booking" },
  { value: "admin_error", label: "Admin error" },
  { value: "event_cancelled", label: "Event cancelled" },
  { value: "goodwill", label: "Goodwill" },
  { value: "other", label: "Other" },
];

function getSeatStatus(attendee: Attendee) {
  if (attendee.refunded) return "Refunded";
  if (attendee.cancelled) return "Cancelled";
  return "Active";
}

function getGroupStatus(group: AttendeeGroup) {
  const total = group.attendees.length;
  const refundedCount = group.attendees.filter((a) => a.refunded).length;
  const cancelledCount = group.attendees.filter((a) => a.cancelled).length;

  if (cancelledCount === total && refundedCount === 0) return "Cancelled";
  if (refundedCount === total) return "Refunded";
  if (refundedCount > 0) return "Partially refunded";
  return "Active";
}

export default function EventAttendeesTable({
  groups,
}: {
  groups: AttendeeGroup[];
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const [refunding, setRefunding] = useState<string | null>(null);
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [reason, setReason] =
    useState<RefundReason>("customer_requested_cancellation");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const aPriority =
        a.status === "active"
          ? 0
          : a.status === "partially_refunded"
          ? 1
          : a.status === "cancelled"
          ? 2
          : 3;

      const bPriority =
        b.status === "active"
          ? 0
          : b.status === "partially_refunded"
          ? 1
          : b.status === "cancelled"
          ? 2
          : 3;

      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.primary_name.localeCompare(b.primary_name);
    });
  }, [groups]);

  function toggleGroup(groupId: string) {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }

  function openRefundModal(attendee: Attendee) {
    if (attendee.refunded || attendee.cancelled) return;
    setSelectedAttendee(attendee);
    setReason("customer_requested_cancellation");
    setNotes("");
    setError(null);
  }

  function closeRefundModal() {
    if (refunding) return;
    setSelectedAttendee(null);
    setReason("customer_requested_cancellation");
    setNotes("");
    setError(null);
  }

  async function confirmRefund() {
    if (!selectedAttendee) return;

    setError(null);
    setRefunding(selectedAttendee.booking_id);

    try {
      const payload = {
        bookingId: selectedAttendee.booking_id,
        reason,
        notes: notes.trim() || null,
      };

      console.log("Refund payload:", payload);

      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok) {
        setError(data?.error || "Refund failed");
        setRefunding(null);
        return;
      }

      window.location.reload();
    } catch {
      setError("Refund failed. Please try again.");
      setRefunding(null);
    }
  }

  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold mb-4">Attendees</h2>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Tickets</th>
              <th className="p-3 text-left">Total paid</th>
              <th className="p-3 text-left">Refunded</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Details</th>
            </tr>
          </thead>

          <tbody>
            {sortedGroups.map((group) => {
              const isExpanded = !!expandedGroups[group.group_id];
              const groupStatus = getGroupStatus(group);
              const isMuted =
                group.status === "refunded" || group.status === "cancelled";

              return (
                <Fragment key={group.group_id}>
                  <tr
                    className={`border-t ${isMuted ? "bg-neutral-50 text-neutral-500" : ""}`}
                  >
                    <td className="p-3 font-medium">{group.primary_name}</td>
                    <td className="p-3">{group.primary_email || "-"}</td>
                    <td className="p-3">{group.ticket_count}</td>
                    <td className="p-3">£{group.total_paid.toFixed(2)}</td>
                    <td className="p-3">£{group.refunded_total.toFixed(2)}</td>
                    <td className="p-3">{groupStatus}</td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleGroup(group.group_id)}
                      >
                        {isExpanded ? "Hide" : "View"}
                      </Button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="border-t bg-white">
                      <td colSpan={7} className="p-0">
                        <div className="p-4">
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                              <thead className="bg-neutral-50">
                                <tr>
                                  <th className="p-3 text-left">Seat / Ticket</th>
                                  <th className="p-3 text-left">Name</th>
                                  <th className="p-3 text-left">Email</th>
                                  <th className="p-3 text-left">Price</th>
                                  <th className="p-3 text-left">Status</th>
                                  <th className="p-3 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.attendees.map((attendee, index) => {
                                  const seatMuted =
                                    attendee.refunded || attendee.cancelled;

                                  return (
                                    <tr
                                      key={attendee.booking_id}
                                      className={`border-t ${
                                        seatMuted
                                          ? "bg-neutral-50 text-neutral-500"
                                          : ""
                                      }`}
                                    >
                                      <td className="p-3">Ticket {index + 1}</td>
                                      <td className="p-3 font-medium">
                                        {attendee.name || `Guest ${index + 1}`}
                                      </td>
                                      <td className="p-3">
                                        {attendee.email || "-"}
                                      </td>
                                      <td className="p-3">
                                        £{Number(attendee.price).toFixed(2)}
                                      </td>
                                      <td className="p-3">
                                        {getSeatStatus(attendee)}
                                      </td>
                                      <td className="p-3 text-right">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-red-600 border-red-300 hover:bg-red-50"
                                          disabled={
                                            attendee.refunded ||
                                            attendee.cancelled ||
                                            refunding === attendee.booking_id
                                          }
                                          onClick={() => openRefundModal(attendee)}
                                        >
                                          {refunding === attendee.booking_id
                                            ? "Refunding..."
                                            : "Refund ticket"}
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedAttendee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-red-700">Confirm refund</h3>
              <p className="mt-1 text-sm text-neutral-600">
                This will send a real refund through Stripe.
              </p>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-lg border bg-neutral-50 p-4 text-sm">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-neutral-500">Customer</p>
                    <p className="font-medium">{selectedAttendee.name || "Guest"}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Email</p>
                    <p className="font-medium break-all">
                      {selectedAttendee.email || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Refund amount</p>
                    <p className="font-medium">
                      £{Number(selectedAttendee.price).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Booking ID</p>
                    <p className="font-medium break-all">
                      {selectedAttendee.booking_id}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="refund-reason"
                  className="mb-2 block text-sm font-medium"
                >
                  Refund reason
                </label>
                <select
                  id="refund-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as RefundReason)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-neutral-400"
                >
                  {REFUND_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="refund-notes"
                  className="mb-2 block text-sm font-medium"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="refund-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any internal notes for the refund log"
                  rows={4}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-neutral-400"
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <Button
                variant="outline"
                onClick={closeRefundModal}
                disabled={!!refunding}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700"
                onClick={confirmRefund}
                disabled={!!refunding}
              >
                {refunding
                  ? "Processing..."
                  : `Confirm refund of £${Number(selectedAttendee.price).toFixed(2)}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}