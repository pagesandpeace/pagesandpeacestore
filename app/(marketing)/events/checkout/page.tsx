"use client";

import { useEffect, useMemo, useState } from "react";

type BasketItem = { ticketTypeId: string; quantity: number };
type Detail = { id: string; name: string; price_pence: number; events: { title: string; starts_at: string } | { title: string; starts_at: string }[] };

function readBasket() {
  try { return JSON.parse(window.localStorage.getItem("app_core_event_basket_v1") ?? "[]") as BasketItem[]; } catch { return []; }
}

export default function EventCheckoutPage() {
  const [items, setItems] = useState<BasketItem[]>([]);
  const [details, setDetails] = useState<Detail[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const basket = readBasket();
    setItems(basket);
    if (!basket.length) { setLoading(false); return; }
    fetch("/api/app-core/basket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketTypeIds: basket.map((item) => item.ticketTypeId) }) })
      .then((response) => response.json())
      .then((data) => { setDetails(data.items ?? []); if ((data.items ?? []).length !== basket.length) setStatus("One or more tickets are no longer available. Please remove them and choose again."); })
      .catch(() => setStatus("We could not load this basket. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  const enriched = useMemo(() => items.map((item) => ({ ...item, detail: details.find((detail) => detail.id === item.ticketTypeId) })).filter((item) => item.detail), [items, details]);
  const total = enriched.reduce((sum, item) => sum + item.quantity * item.detail!.price_pence, 0);

  async function checkout() {
    setStatus("Preparing secure checkout…");
    const response = await fetch("/api/app-core/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) {
      const messages: Record<string, string> = {
        AUTH_REQUIRED: "Please sign in before checkout.",
        NOT_ENOUGH_SEATS: "There are no longer enough places available for this selection.",
        INVALID_BASKET: "Your basket needs refreshing. Please remove and add the ticket again.",
        CHECKOUT_UNAVAILABLE: "Checkout could not be started. Please try again in a moment.",
      };
      setStatus(messages[data.error] ?? "Checkout could not be started. Please try again.");
      return;
    }
    window.location.assign(data.url);
  }

  function remove(ticketTypeId: string) {
    const next = items.filter((item) => item.ticketTypeId !== ticketTypeId);
    setItems(next); window.localStorage.setItem("app_core_event_basket_v1", JSON.stringify(next));
    setDetails((current) => current.filter((detail) => detail.id !== ticketTypeId));
  }

  return <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
    <h1 className="text-3xl font-bold">Your event basket</h1>
    <p className="mt-2 text-foreground/65">Review your tickets below. Availability is checked again immediately before payment.</p>
    {loading ? <p className="mt-8">Loading basket…</p> : items.length === 0 ? <p className="mt-8">Your basket is empty.</p> : <div className="mt-8 space-y-3">
      {enriched.map((item) => {
        const event = Array.isArray(item.detail!.events) ? item.detail!.events[0] : item.detail!.events;
        return <div key={item.ticketTypeId} className="flex items-center justify-between gap-4 rounded-lg border p-4"><div><p className="font-semibold">{event?.title}</p><p className="text-sm text-foreground/65">{item.detail!.name} × {item.quantity}</p></div><div className="text-right"><p className="font-semibold">£{((item.detail!.price_pence * item.quantity) / 100).toFixed(2)}</p><button onClick={() => remove(item.ticketTypeId)} className="mt-1 text-sm underline">Remove</button></div></div>;
      })}
      <div className="flex justify-between border-t pt-4 text-lg font-bold"><span>Total</span><span>£{(total / 100).toFixed(2)}</span></div>
      <button onClick={checkout} disabled={!enriched.length} className="mt-4 w-full rounded-lg bg-black px-4 py-3 font-semibold text-white disabled:opacity-50">Continue to secure payment</button>
    </div>}
    {status ? <p className="mt-4 text-sm" role="status">{status}</p> : null}
  </main>;
}