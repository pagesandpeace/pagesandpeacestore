"use client";

import { useState } from "react";

type Ticket = { id: string; name: string; price_pence: number };

export function EventTicketPicker({ tickets, soldOut }: { tickets: Ticket[]; soldOut: boolean }) {
  const [selected, setSelected] = useState(tickets[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  function addToBasket() {
    if (!selected) return;
    const key = "app_core_event_basket_v1";
    const previous = JSON.parse(window.localStorage.getItem(key) ?? "[]") as { ticketTypeId: string; quantity: number }[];
    const next = previous.filter((item) => item.ticketTypeId !== selected);
    const existing = previous.find((item) => item.ticketTypeId === selected);
    next.push({ ticketTypeId: selected, quantity: Math.min(10, (existing?.quantity ?? 0) + quantity) });
    window.localStorage.setItem(key, JSON.stringify(next));
    setMessage("Added to your basket.");
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
        <input value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(10, Number(event.target.value) || 1)))} disabled={soldOut} type="number" min="1" max="10" className="mt-1 w-full rounded-lg border px-3 py-2" />
      </label>
      <button type="button" onClick={addToBasket} disabled={soldOut || !selected} className="mt-4 w-full rounded-lg bg-black px-4 py-3 font-semibold text-white disabled:opacity-50">
        {soldOut ? "Sold out" : "Add to basket"}
      </button>
      <a href="/events/checkout" className="mt-3 block text-center text-sm underline underline-offset-4">View basket and checkout</a>
      {message ? <p className="mt-3 text-sm text-green-700" role="status">{message}</p> : null}
    </div>
  );
}