"use client";

import { useState } from "react";
import RequestCancellationButton from "@/components/events/RequestCancellationButton";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface Booking {
  id: string;
  cancelled: boolean;
  cancellationRequested: boolean;
  paid: boolean;
  refunded: boolean;

  // ⭐ NEW FIELDS
  refundId?: string | null;
  refundedAt?: string | null;
  stripeCheckoutSessionId?: string | null;
}

interface Event {
  title: string;
  date: string;
  pricePence: number;
}

interface Props {
  booking: Booking;
  event: Event;
}

export default function BookingDetailClient({ booking, event }: Props) {
  const [localRequested, setLocalRequested] = useState(
    booking.cancellationRequested
  );
  const [localCancelled] = useState(booking.cancelled);
  const [localRefunded] = useState(booking.refunded);

  function markRequested() {
    setLocalRequested(true);
  }

  // Stripe receipt link (if we have the checkout session)
  const stripeReceiptLink = booking.stripeCheckoutSessionId
    ? `https://dashboard.stripe.com/payments/${booking.stripeCheckoutSessionId}`
    : null;

  return (
    <section className="bg-white border rounded-xl p-6 shadow-sm space-y-4">

      <p><strong>Booking ID:</strong> {booking.id}</p>

      {/* STATUS */}
      <p>
        <strong>Status:</strong>{" "}
        {localCancelled ? (
          <span className="text-red-600 font-semibold">Cancelled</span>
        ) : localRefunded ? (
          <span className="text-purple-700 font-semibold">Refunded</span>
        ) : localRequested ? (
          <span className="text-orange-600 font-semibold">
            Cancellation Requested
          </span>
        ) : (
          <span className="text-green-600 font-semibold">Active</span>
        )}
      </p>

      {/* PAYMENT STATUS */}
      <p>
        <strong>Payment Status:</strong>{" "}
        {localRefunded ? (
          <span className="text-purple-700 font-semibold">Refunded</span>
        ) : booking.paid ? (
          <span className="text-green-600 font-semibold">Paid</span>
        ) : (
          <span className="text-orange-600 font-semibold">Pending</span>
        )}
      </p>

      {/* REFUND DETAILS */}
      {localRefunded && (
        <div className="mt-4 p-4 border rounded-lg bg-purple-50 space-y-2">
          <h3 className="font-semibold text-purple-800">Refund Details</h3>

          <p>
            <strong>Refund ID:</strong>{" "}
            {booking.refundId || "Unknown"}
          </p>

          <p>
            <strong>Refunded At:</strong>{" "}
            {booking.refundedAt
              ? new Date(booking.refundedAt).toLocaleString("en-GB")
              : "Timestamp unavailable"}
          </p>

          {stripeReceiptLink && (
            <a
              href={stripeReceiptLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="text-purple-700">
                View Stripe Receipt
              </Button>
            </a>
          )}
        </div>
      )}

      {/* EVENT INFO */}
      <div className="pt-4 border-t space-y-2">
        <h3 className="text-lg font-semibold">Event Info</h3>
        <p><strong>Title:</strong> {event.title}</p>
        <p>
          <strong>Date:</strong>{" "}
          {new Date(event.date).toLocaleString("en-GB")}
        </p>
        <p><strong>Price:</strong> £{(event.pricePence / 100).toFixed(2)}</p>
      </div>

      {/* ACTION BUTTONS */}
      <div className="pt-6 flex flex-col items-center gap-3">
        {!localCancelled && !localRequested && !localRefunded && (
          <RequestCancellationButton
            bookingId={booking.id}
            eventTitle={event.title}
            onSuccess={markRequested}
          />
        )}

        {(localRequested || localRefunded) && !localCancelled && (
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="opacity-60 cursor-not-allowed text-orange-700"
          >
            {localRefunded ? "Refunded" : "Cancellation Requested"}
          </Button>
        )}

        <a
          href={`mailto:admin@pagesandpeace.co.uk?subject=Event Booking Help: ${encodeURIComponent(
            event.title
          )}`}
        >
          <Button variant="neutral" size="sm">
            Contact Pages & Peace
          </Button>
        </a>

        <Link
          href="/events/booking-terms"
          className="text-xs underline text-accent hover:opacity-75"
        >
          Booking Terms & Conditions
        </Link>
      </div>
    </section>
  );
}
