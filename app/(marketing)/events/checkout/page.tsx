"use client";

import { useEffect, useState } from "react";

type BasketItem = { ticketTypeId: string; quantity: number };

export default function EventCheckoutPage() {
  const [items, setItems] = useState<BasketItem[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => { setItems(JSON.parse(window.localStorage.getItem("app_core_event_basket_v1") ?? "[]")); }, []);

  async function checkout() {
    setStatus("Preparing secure checkout…");
    const response = await fetch("/api/app-core/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    const data = await response.json();
    if (!response.ok || !data.url) { setStatus(data.error === "AUTH_REQUIRED" ? "Please sign in before checkout." : "This basket could not be checked out. Please review availability and try again."); return; }
    window.location.assign(data.url);
  }

  function remove(ticketTypeId: string) {
    const next = items.filter((item) => item.ticketTypeId !== ticketTypeId);
    setItems(next); window.localStorage.setItem("app_core_event_basket_v1", JSON.stringify(next));
  }

  return <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
    <h1 className="text-3xl font-bold">Your event basket</h1>
    <p className="mt-2 text-foreground/65">Prices and availability are confirmed securely at checkout.</p>
    {items.length === 0 ? <p className="mt-8">Your basket is empty.</p> : <div className="mt-8 space-y-3">
      {items.map((item) => <div key={item.ticketTypeId} className="flex items-center justify-between rounded-lg border p-4"><span>{item.quantity} ticket{item.quantity === 1 ? "" : "s"} selected</span><button onClick={() => remove(item.ticketTypeId)} className="text-sm underline">Remove</button></div>)}
      <button onClick={checkout} className="mt-4 w-full rounded-lg bg-black px-4 py-3 font-semibold text-white">Continue to secure payment</button>
    </div>}
    {status ? <p className="mt-4 text-sm" role="status">{status}</p> : null}
  </main>;
}