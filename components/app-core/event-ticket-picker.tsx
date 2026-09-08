"use client";

import Link from "next/link";
import { useState } from "react";

type Ticket = { id: string; name: string; price_pence: number };

export function EventTicketPicker({
  tickets,
  soldOut,
  remainingSeats,
}: {
  tickets: Ticket[];
  soldOut: boolean;
  remainingSeats: number;
}) {
  const maxQuantity = Math.max(0, Math.min(10, remainingSeats));
  const [selected, setSelected] = useState(tickets[0]?.id ?? "");
  const [quantity, setQuantity] = useState(maxQuantity > 0 ? 1 : 0);
  const [message, setMessage] = useState("");

  function addToBasket() {
    if (!selected || maxQuantity < 1) return;

    const key = "app_core_event_basket_v1";
    const previous = JSON.parse(window.localStorage.getItem(key) ?? "[]") as { ticketTypeId: string; quantity: number }[];
    const existing = previous.find((item) => item.ticketTypeId === selected);
    const existingQuantity = existing?.quantity ?? 0;
    const allowedToAdd = Math.max(0, maxQuantity - existingQuantity);

    if (allowedToAdd < 1) {
      setMessage(`Your basket already contains the maximum available quantity (${maxQuantity}).`);
      return;
    }

    const addQuantity = Math.min(quantity, allowedToAdd);
    const next = previous.filter((item) => item.ticketTypeId !== selected);
    next.push({ ticketTypeId: selected, quantity: existingQuantity + addQuantity });
    window.localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event("app-core-basket-changed"));

    if (addQuantity < quantity) {
      setMessage(`Only ${maxQuantity} ticket${maxQuantity === 1 ? " is" : "s are"} currently available. Your basket has been limited to that quantity.`);
    } else {
      setMessage("Added to your basket.");
    }
  }

  function handleQuantity(value: string) {
    if (maxQuantity < 1) return;
    const parsed = Number(value);
    const next = Number.isFinite(parsed) ? Math.max(1, Math.min(maxQuantity, Math.trunc(parsed))) : 1;
    setQuantity(next);
  }

  return (
    <div className="mt-7 border-t pt-6">
      <h2 className="text-lg font-semibold text-foreground">Tickets</h2>
      <label className="mt-4 block text-sm font-medium">
        Ticket type
        <select value={selected} onChange={(event) => setSelected(event.target.value)} disabled={soldOut} className="mt-1 w-full rounded-lg border px-3 py-2">
          {tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.name} — £{(ticket.price_pence / 100).toFixed(2)}</option>)}
        </select>
      </label>
      <label className="mt-3 block text-sm font-medium">
        Quantity
        <input
          value={quantity}
          onChange={(event) => handleQuantity(event.target.value)}
          disabled={soldOut}
          type="number"
          min="1"
          max={maxQuantity || 1}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
        {!soldOut ? <span className="mt-1 block text-xs text-foreground/60">Maximum currently available: {maxQuantity}</span> : null}
      </label>
      <button type="button" onClick={addToBasket} disabled={soldOut || !selected || maxQuantity < 1} className="mt-4 w-full rounded-lg bg-black px-4 py-3 font-semibold text-white disabled:opacity-50">
        {soldOut ? "Sold out" : "Add to basket"}
      </button>
      {message ? <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status"><p className="font-medium">{message}</p><div className="mt-3 flex flex-wrap gap-3"><Link href="/events" className="rounded-md border border-emerald-700 px-3 py-2 font-semibold">Continue browsing events</Link><Link href="/events/checkout" className="rounded-md bg-emerald-800 px-3 py-2 font-semibold text-white">View basket &amp; checkout</Link></div></div> : <Link href="/events/checkout" className="mt-3 block text-center text-sm underline underline-offset-4">View basket and checkout</Link>}
    </div>
  );
}
