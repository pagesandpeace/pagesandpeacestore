"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Order = { status: string; total_pence: number; currency: string };

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("Checking your booking confirmation…");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setMessage("We could not identify this checkout.");
      return;
    }

    let attempts = 0;
    let cancelled = false;
    let timer: number | undefined;

    const check = async () => {
      attempts += 1;
      const response = await fetch(`/api/app-core/orders/status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (cancelled) return true;

      if (data.order?.status === "paid") {
        setOrder(data.order);
        setMessage("Your booking is confirmed.");
        window.localStorage.removeItem("app_core_event_basket_v1");
        window.dispatchEvent(new Event("app-core-basket-changed"));
        return true;
      }

      if (attempts >= 12) {
        setMessage("We have not yet received payment confirmation from Stripe. Please do not pay again; we will confirm your booking by email once it arrives.");
        return true;
      }

      return false;
    };

    void check().then((done) => {
      if (done || cancelled) return;
      timer = window.setInterval(() => {
        void check().then((complete) => {
          if (complete && timer) window.clearInterval(timer);
        });
      }, 2500);
    });

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [searchParams]);

  return <main className="mx-auto min-h-screen max-w-xl px-6 py-20 text-center">
    <h1 className="text-3xl font-bold">{order ? "Booking confirmed" : "Confirming booking"}</h1>
    <p className="mt-4 text-foreground/70">{message}</p>
    {order ? <p className="mt-5 text-lg font-semibold">Total paid: £{(order.total_pence / 100).toFixed(2)}</p> : null}
    <Link href="/events" className="mt-8 inline-flex rounded-lg bg-black px-5 py-3 font-semibold text-white">Browse events</Link>
  </main>;
}

export default function BookingSuccessPage() {
  return <Suspense fallback={<main className="mx-auto min-h-screen max-w-xl px-6 py-20 text-center">Confirming your booking…</main>}><BookingSuccessContent /></Suspense>;
}
