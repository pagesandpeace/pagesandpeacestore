"use client";

import Link from "next/link";

export default function NeedRefundHelp({
  orderId,
}: {
  orderId: string;
}) {
  return (
    <div className="mt-8 rounded-xl border bg-[#FAF6F1] p-4 text-sm text-neutral-700">
      <p className="font-semibold mb-1">Need a refund?</p>

      <p className="opacity-80">
        Refunds are reviewed and processed by our team.
        If you believe you’re eligible for a refund, please get in touch and
        include your order number.
      </p>

      <p className="mt-3">
        📧{" "}
        <a
          href={`mailto:admin@pagesandpeace.co.uk?subject=Refund request for order ${orderId}`}
          className="underline font-medium"
        >
          admin@pagesandpeace.co.uk
        </a>
      </p>

      <p className="mt-2 text-xs opacity-70">
        Order reference: <span className="font-mono">{orderId}</span>
      </p>

      <p className="mt-3 text-xs">
        <Link href="/refund-policy" className="underline">
          View refund policy
        </Link>
      </p>
    </div>
  );
}
