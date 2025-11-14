"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";

type SessionResp = {
  id: string;
  amount_total: number | null;
  currency: string | null;
  customer_email: string | null;
  metadata: Record<string, string>;
  payment_intent: string | null;
  status: string | null;
  error?: string;
};

export default function VoucherSuccessPage() {
  const [sid, setSid] = useState<string | null>(null);
  const [session, setSession] = useState<SessionResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [realCode, setRealCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Read search params safely (client-only)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSid(params.get("sid"));
  }, []);

  // Load Stripe session
  useEffect(() => {
    if (!sid) return;

    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/vouchers/session?sid=${sid}`, {
          cache: "no-store",
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load session");

        if (!cancelled) setSession(data);
      } catch (e: any) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [sid]);

  // Poll for voucher creation
  useEffect(() => {
    if (!sid) return;

    let tries = 0;
    let cancelled = false;

    const poll = async () => {
      tries++;
      try {
        const res = await fetch(`/api/vouchers/by-session?sid=${sid}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.found && data.code) {
          if (!cancelled) setRealCode(data.code);
          return;
        }
      } catch {}

      if (tries < 10 && !cancelled) setTimeout(poll, 2000);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [sid]);

  // Generate QR
  useEffect(() => {
    if (!realCode) return;

    const run = async () => {
      const base =
        process.env.NEXT_PUBLIC_SITE_URL ||
        window.location.origin;

      const url = `${base}/vouchers/${realCode}`;
      const qr = await QRCode.toDataURL(url);
      setQrDataUrl(qr);
    };

    run();
  }, [realCode]);

  // STATES
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div>Loading your voucher…</div>
      </main>
    );
  }

  if (err) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-semibold mb-2">We hit a snag</h1>
        <p className="mb-6 opacity-75">{err}</p>
        <Link href="/gift-vouchers">
          <Button variant="primary">Back to vouchers</Button>
        </Link>
      </main>
    );
  }

  const md = session?.metadata || {};
  const amount = (session?.amount_total ?? 0) / 100;
  const symbol =
    (session?.currency || "").toUpperCase() === "GBP" ? "£" : "€";

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      {/* LEFT (voucher preview) */}
      <section className="p-6 flex justify-center items-center bg-[var(--background)]">
        <div className="w-full max-w-sm rounded-xl border p-6 bg-white shadow">
          <h1 className="text-2xl font-semibold">Your Gift Voucher</h1>
          <p className="mt-2 opacity-80">
            Amount: <strong>{symbol}{amount.toFixed(2)}</strong>
          </p>

          <div className="mt-4 border rounded-xl p-4 text-sm">
            <div>To: {md.toName || "Recipient"}</div>
            <div>From: {md.fromName || "You"}</div>
            {md.message && (
              <div className="mt-2 italic opacity-70 line-clamp-4">
                {md.message}
              </div>
            )}
          </div>

          {qrDataUrl && (
            <div className="mt-6 w-32 h-32 relative mx-auto">
              <Image
                src={qrDataUrl}
                alt="Voucher QR"
                fill
                unoptimized
                className="rounded"
              />
            </div>
          )}

          {realCode && (
            <p className="mt-4 text-sm text-center opacity-80">
              Code: <strong>{realCode}</strong>
            </p>
          )}
        </div>
      </section>

      {/* RIGHT (information) */}
      <section className="p-6 flex items-center">
        <div className="max-w-lg">
          <h2 className="text-2xl font-semibold">What happens next</h2>
          <ol className="mt-4 space-y-2 text-sm">
            <li>Your voucher will be emailed shortly.</li>
            <li>Show the QR code in store.</li>
            <li>Enjoy your Pages & Peace visit.</li>
          </ol>

          <div className="mt-6 flex gap-3">
            <Link href="/gift-vouchers">
              <Button variant="outline">Buy another</Button>
            </Link>
            <Link href="/shop">
              <Button variant="primary">Back to shop</Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
