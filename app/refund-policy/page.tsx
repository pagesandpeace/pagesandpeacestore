// app/refunds/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default function RefundsPage() {
  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-[#111]">
      <div className="mx-auto max-w-3xl space-y-10">

        {/* HEADER */}
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold">
            Refunds & Cancellations
          </h1>
          <p className="text-sm opacity-70">
            We aim to be fair, transparent, and human.
          </p>
        </header>

        {/* POLICY */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Our refund policy</h2>

          <p className="text-sm text-neutral-700">
            Refunds are handled manually by our team. If something didn’t go as
            expected, we want to hear from you.
          </p>

          <ul className="list-disc pl-5 text-sm text-neutral-700 space-y-2">
            <li>
              <strong>Events:</strong> Refunds may be available depending on the
              event and how close it is to the start time.
            </li>
            <li>
              <strong>Shop orders:</strong> If an item arrives damaged or is
              incorrect, please contact us as soon as possible.
            </li>
            <li>
              <strong>Partial refunds:</strong> In some cases (such as multi-seat
              bookings), partial refunds may apply.
            </li>
          </ul>

          <p className="text-sm text-neutral-700">
            We review every request individually and always aim to respond
            quickly.
          </p>
        </section>

        {/* HOW TO REQUEST */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">How to request a refund</h2>

          <ol className="list-decimal pl-5 text-sm text-neutral-700 space-y-2">
            <li>Have your order ID ready (you can find this in My Orders).</li>
            <li>
              Send us a short message explaining what went wrong or what you’d
              like refunded.
            </li>
            <li>
              Our team will review your request and get back to you by email.
            </li>
          </ol>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border bg-[#F3ECE5] p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold">Need a refund?</h3>

          <p className="text-sm text-neutral-700">
            Contact us directly and we’ll take it from there.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:admin@pagesandpeace.co.uk?subject=Refund request"
              className="w-full"
            >
              <Button variant="primary" size="md" className="w-full">
                Request a refund
              </Button>
            </a>

            <Link href="/dashboard/orders" className="w-full">
              <Button variant="neutral" size="md" className="w-full">
                View my orders
              </Button>
            </Link>
          </div>

          <p className="text-xs text-neutral-500">
            Please include your order ID so we can help you faster.
          </p>
        </section>
      </div>
    </main>
  );
}
