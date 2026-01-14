"use client";

import { useEffect, useState, useCallback } from "react";

type Ticket = {
  id: string;
  name: string;
  price_pence: number;
  is_default: boolean;
  is_active: boolean;
};

type DraftTicket = {
  name: string;
  price: string;
  is_active: boolean;
};

export default function TicketEditor({
  eventId,
  isAdmin,
}: {
  eventId: string;
  isAdmin: boolean;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftTicket>>({});
  const [hasBookings, setHasBookings] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const priceLocked = hasBookings && !isAdmin;

  /* -----------------------------------------
     FETCH (STABLE)
  ----------------------------------------- */
  const fetchTickets = useCallback(async () => {
    const ticketsRes = await fetch(
      `/api/admin/events/${eventId}/tickets`,
      { cache: "no-store" }
    );

    const ticketsJson = await ticketsRes.json();
    const ticketData: Ticket[] = Array.isArray(ticketsJson)
      ? ticketsJson
      : ticketsJson.tickets ?? [];

    setTickets(ticketData);

    const nextDrafts: Record<string, DraftTicket> = {};
    ticketData.forEach((t) => {
      nextDrafts[t.id] = {
        name: t.name,
        price: (t.price_pence / 100).toFixed(2),
        is_active: t.is_active,
      };
    });
    setDrafts(nextDrafts);

    const bookingRes = await fetch(
      `/api/admin/events/${eventId}/has-bookings`,
      { cache: "no-store" }
    );

    const bookingJson = await bookingRes.json();
    setHasBookings(Boolean(bookingJson?.hasBookings));
  }, [eventId]);

  /* -----------------------------------------
     EFFECT
  ----------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      await fetchTickets();
      if (!cancelled) setLoading(false);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [fetchTickets]);

  /* -----------------------------------------
     PERSIST EXISTING TICKET
  ----------------------------------------- */
  async function persistTicket(id: string) {
    const draft = drafts[id];
    const original = tickets.find((t) => t.id === id);
    if (!draft || !original) return;

    if (
      !isAdmin &&
      hasBookings &&
      Math.round(Number(draft.price) * 100) !== original.price_pence
    ) {
      return;
    }

    const payload: {
      id: string;
      name?: string;
      price_pence?: number;
      is_active?: boolean;
    } = {
      id,
      name: draft.name,
      is_active: draft.is_active,
    };

    const newPricePence = Math.round(Number(draft.price) * 100);
    if (
      newPricePence !== original.price_pence &&
      (isAdmin || !hasBookings)
    ) {
      payload.price_pence = newPricePence;
    }

    await fetch("/api/admin/tickets/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  /* -----------------------------------------
     CREATE NEW TICKET
  ----------------------------------------- */
  async function createTicket() {
    if (!newName || !newPrice) {
      setError("Name and price required");
      return;
    }

    if (priceLocked) return;

    setSubmitting(true);
    setError("");

    const res = await fetch(
      `/api/admin/events/${eventId}/tickets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          price_pence: Math.round(Number(newPrice) * 100),
          is_active: newIsActive,
        }),
      }
    );

    if (!res.ok) {
      setError("Failed to create ticket");
      setSubmitting(false);
      return;
    }

    setNewName("");
    setNewPrice("");
    setNewIsActive(true);
    await fetchTickets();
    setSubmitting(false);
  }

  if (loading) return <p>Loading ticket types…</p>;

  return (
    <div className="mt-10 space-y-8">
      <h2 className="text-xl font-semibold">Ticket Types & Pricing</h2>

      {priceLocked && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <strong>Prices locked.</strong> Tickets have already been sold for this event.
        </div>
      )}

      {tickets.map((t) => {
        const draft = drafts[t.id];
        if (!draft) return null;

        return (
          <div
            key={t.id}
            className={`border rounded-lg p-4 space-y-3 ${
              t.is_default ? "bg-blue-50 border-blue-300" : "bg-white"
            }`}
          >
            {t.is_default && (
              <div className="text-xs font-medium text-blue-700">
                Base ticket (capacity & pricing anchor)
              </div>
            )}

            <input
              className="border rounded px-3 py-2 w-full"
              value={draft.name}
              onChange={(e) =>
                setDrafts((d) => ({
                  ...d,
                  [t.id]: {
                    ...d[t.id],
                    name: e.target.value,
                  },
                }))
              }
              onBlur={() => persistTicket(t.id)}
            />

            <input
  type="number"
  step="0.01"
  value={draft.price}
  readOnly={priceLocked}
  disabled={priceLocked}
  className={`border rounded px-3 py-2 w-full ${
    priceLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
  }`}
  onChange={(e) =>
    setDrafts((d) => ({
      ...d,
      [t.id]: {
        ...d[t.id],
        price: e.target.value,
      },
    }))
  }
  onBlur={() => persistTicket(t.id)}
/>


            {priceLocked && (
              <p className="text-xs text-red-600">
                Price locked because this event already has bookings.
              </p>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) =>
                  setDrafts((d) => ({
                    ...d,
                    [t.id]: {
                      ...d[t.id],
                      is_active: e.target.checked,
                    },
                  }))
                }
                onBlur={() => persistTicket(t.id)}
              />
              Active
            </label>
          </div>
        );
      })}

      <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
        <h3 className="font-medium">Add ticket type</h3>

        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Ticket name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />

        <input
          type="number"
          step="0.01"
          placeholder="Price (£)"
          value={newPrice}
          disabled={priceLocked}
          readOnly={priceLocked}
          className={`border rounded px-3 py-2 w-full ${
            priceLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
          }`}
          onChange={(e) => {
            if (!priceLocked) setNewPrice(e.target.value);
          }}
        />

        {priceLocked && (
          <p className="text-xs text-red-600">
            Price locked because this event already has bookings.
          </p>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={newIsActive}
            onChange={(e) => setNewIsActive(e.target.checked)}
          />
          Active
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={createTicket}
          disabled={submitting || priceLocked}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add ticket"}
        </button>
      </div>
    </div>
  );
}
