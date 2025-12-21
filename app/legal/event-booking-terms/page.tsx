"use client";

import BackLink from "@/components/Backlink";

export default function EventBookingTermsPage() {
  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-6 py-20 relative">
      {/* 🔙 TOP-LEFT BACK BUTTON */}
      <div className="absolute top-6 left-6">
        <BackLink href="/" label="Back to Home" />
      </div>

      {/* CONTAINER */}
      <div className="max-w-3xl mx-auto space-y-10">
        {/* HEADER */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-wide text-[var(--accent)]">
            Event Booking Terms & Conditions
          </h1>
          <p className="text-neutral-700 max-w-xl mx-auto leading-relaxed">
            These terms apply to all events booked through Pages & Peace, whether
            in-store or online. Please read them carefully before making a
            booking.
          </p>
        </header>

        {/* DIVIDER */}
        <div className="h-px w-24 bg-[var(--gold)] mx-auto" />

        {/* TERMS */}
        <section className="space-y-8">
          {/* 1. Booking Confirmation */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--accent)]">
              1. Booking Confirmation
            </h2>
            <p className="text-neutral-800 leading-relaxed">
              All bookings are processed securely online. You will receive an
              email confirmation once your booking is complete. Your booking is
              not confirmed until payment has been successfully processed.
            </p>
          </div>

          {/* 2. Customer Cancellations */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--accent)]">
              2. Customer Cancellations
            </h2>

            <h3 className="text-lg font-semibold text-[#111]">
              2.1 Standard Cancellation Window
            </h3>
            <p className="text-neutral-800 leading-relaxed">
              Cancellations made{" "}
              <strong>48 hours or more before the event</strong> are eligible for
              a <strong>full refund</strong> or a credit voucher for a future
              event.
            </p>

            <h3 className="text-lg font-semibold text-[#111]">
              2.2 Late Cancellations (Under 48 Hours)
            </h3>
            <p className="text-neutral-800 leading-relaxed">
              Cancellations made within 48 hours of the event start time are
              <strong> not eligible for a refund</strong>. A credit voucher may
              be offered at our discretion if the space can be resold.
            </p>

            <h3 className="text-lg font-semibold text-[#111]">2.3 No-Shows</h3>
            <p className="text-neutral-800 leading-relaxed">
              If you do not attend and have not cancelled, the booking is
              <strong> non-refundable</strong>.
            </p>
          </div>

          {/* 3. Transfers */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--accent)]">
              3. Transfers & Rescheduling
            </h2>
            <p className="text-neutral-800 leading-relaxed">
              You may request to transfer your booking to another event up to 48
              hours before the original event start time. Transfers within 48
              hours are not guaranteed and may not be possible.
            </p>
          </div>

          {/* 4. Cancellations by P&P */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--accent)]">
              4. Cancellations by Pages & Peace
            </h2>
            <p className="text-neutral-800 leading-relaxed">
              Pages & Peace reserves the right to cancel or reschedule an event
              if necessary (e.g., low attendance, illness, venue issues, safety
              concerns). If we cancel, you may choose between a full refund, a
              transfer to a future date, or a credit voucher of equal value.
            </p>
          </div>

          {/* 5. Refund Process */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--accent)]">
              5. Refund Process
            </h2>
            <p className="text-neutral-800 leading-relaxed">
              Refunds are issued to the original payment method. Please allow
              3–10 working days for the refund to appear, depending on your
              bank's processing times.
            </p>
          </div>

          {/* 6. Arrival */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--accent)]">
              6. Arrival & Late Attendance
            </h2>
            <p className="text-neutral-800 leading-relaxed">
              Please arrive on time. Late arrivals may not be admitted if the
              event is already in progress. Late arrival does not qualify for a
              refund.
            </p>
          </div>

          {/* 7. Behaviour */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--accent)]">
              7. Behaviour & Safety
            </h2>
            <p className="text-neutral-800 leading-relaxed">
              Please treat staff and other guests with respect at all times.
              Pages & Peace may remove attendees behaving inappropriately
              without offering a refund.
            </p>
          </div>

          {/* 8. Accessibility */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--accent)]">
              8. Accessibility & Support Needs
            </h2>
            <p className="text-neutral-800 leading-relaxed">
              If you have accessibility requirements or specific support needs,
              please contact us in advance. We will do our best to accommodate
              you.
            </p>
          </div>

          {/* 9. Photography */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--accent)]">
              9. Photography & Media
            </h2>
            <p className="text-neutral-800 leading-relaxed">
              Events may occasionally be photographed for promotional purposes.
              If you prefer not to appear in any photos, please notify a member
              of staff upon arrival.
            </p>
          </div>

          {/* 10. Liability */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--accent)]">
              10. Liability
            </h2>
            <p className="text-neutral-800 leading-relaxed">
              Pages & Peace is not responsible for personal injury or for loss
              or damage to your personal belongings, except where caused by our
              negligence.
            </p>
          </div>

          {/* 11. Contact */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--accent)]">
              11. Contact Information
            </h2>
            <p className="text-neutral-800 leading-relaxed">
              If you need to cancel, reschedule, or discuss a booking, please
              contact us at:
            </p>
            <p className="text-neutral-900 font-medium text-lg">
              admin@pagesandpeace.co.uk
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
