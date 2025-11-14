"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link"; // <-- Added
import { Button } from "@/components/ui/Button";

// ---- Correct Voucher Type ----
type VoucherResponse = {
  id: string;
  code: string;
  total: number;
  remaining: number;
  currency: string;
  status: string;
  buyerEmail: string | null;
  recipientEmail: string | null;
  message: string | null;
  createdAt: string;
  expiresAt: string;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  stripe: {
    chargeId: string | null;
    amount: number | null;
    currency: string | null;
    paidAt: string | null;
    status: string | null;
    receiptUrl: string | null;
    cardBrand: string | null;
    cardLast4: string | null;
    cardCountry: string | null;
  } | null;
};

export default function GiftVoucherReceiptPage() {
  const { code } = useParams<{ code: string }>();

  const [voucher, setVoucher] = useState<VoucherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    const load = async () => {
      try {
        const res = await fetch(`/api/vouchers/get?code=${code}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to load voucher");

        setVoucher(data.voucher);
      } catch (e: unknown) {
        if (e instanceof Error) setErr(e.message);
        else setErr("Unknown error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [code]);

  // -------------------------------------------------------
  // LOADING / ERROR
  // -------------------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm opacity-70">Loading voucher…</p>
      </main>
    );
  }

  if (err || !voucher) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Voucher not found</h1>
        <p className="opacity-80 mb-6">{err || "Invalid voucher"}</p>

        {/* FIXED <a> → <Link> */}
        <Link href="/dashboard/orders" className="underline text-[var(--accent)]">
          Back to orders
        </Link>
      </main>
    );
  }

  const expired = new Date(voucher.expiresAt) < new Date();
  const stripe = voucher.stripe;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#FAF6F1]">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">

        <div className="text-sm uppercase tracking-wide opacity-60 mb-1">
          Pages & Peace
        </div>

        <h1 className="text-2xl font-semibold">Gift Voucher Receipt</h1>

        <p className="mt-3 text-sm">
          Total value: <strong>£{voucher.total.toFixed(2)}</strong>
        </p>

        <p className="mt-1 text-sm">
          Remaining: <strong>£{voucher.remaining.toFixed(2)}</strong>
        </p>

        <p className={`mt-2 text-sm ${expired ? "text-red-600" : "text-green-700"}`}>
          Status: {expired ? "Expired" : voucher.status}
        </p>

        {/* ---- Stripe Payment Info ---- */}
        {stripe && (
          <div className="mt-4 rounded-xl border p-4 bg-[#FAF6F1]">
            <p className="text-sm font-semibold mb-2">Payment Details</p>

            <p className="text-sm">
              Paid: <strong>£{stripe.amount?.toFixed(2)}</strong>
            </p>

            {stripe.paidAt && (
              <p className="text-sm">
                Date: {new Date(stripe.paidAt).toLocaleString()}
              </p>
            )}

            {stripe.cardBrand && (
              <p className="text-sm">
                Card: {stripe.cardBrand.toUpperCase()} •••• {stripe.cardLast4}
              </p>
            )}

            {stripe.receiptUrl && (
              <p className="text-sm mt-2">
                <a
                  href={stripe.receiptUrl}
                  target="_blank"
                  className="underline text-[var(--accent)]"
                >
                  View Stripe Receipt
                </a>
              </p>
            )}
          </div>
        )}

        {/* ---- Voucher Details ---- */}
        <div className="mt-6 rounded-xl border p-4 bg-white">
          <p className="text-sm opacity-60">Details</p>

          <p className="mt-2 text-sm">
            To: <strong>{voucher.recipientEmail || "Recipient"}</strong>
          </p>

          <p className="text-sm">
            From: <strong>{voucher.buyerEmail || "Sender"}</strong>
          </p>

          {voucher.message && (
            <p className="mt-2 text-xs italic opacity-80">{voucher.message}</p>
          )}

          <p className="mt-3 text-xs opacity-70">
            Valid until {new Date(voucher.expiresAt).toLocaleDateString()}
          </p>
        </div>

        {/* ---- Buttons ---- */}
        <div className="mt-6 flex flex-col gap-3">

          {/* FIX: use Link + Button instead of window.location.href */}
          <Link href="/dashboard/orders" className="w-full">
            <Button variant="neutral" className="w-full">Back to orders</Button>
          </Link>

          <Link href="/gift-vouchers" className="w-full">
            <Button variant="primary" className="w-full">Buy another voucher</Button>
          </Link>
        </div>

        <p className="mt-4 text-xs text-center opacity-70">
          Keep this receipt for your records.
        </p>
      </div>
    </main>
  );
}
