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

export default function TicketEditor({ eventId }: { eventId: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftTicket>>({});
  const [loading, setLoading] = useState(true);

  // new ticket draft
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);

    const res = await fetch(
      `/api/admin/events/${eventId}/tickets`,
      { cache: "no-store" }
    );

    const data: Ticket[] = await res.json();

    setTickets(data);

    // initialise drafts once per load
    const nextDrafts: Record<string, DraftTicket> = {};
    data.forEach((t) => {
      nextDrafts[t.id] = {
        name: t.name,
        price: (t.price_pence / 100).toFixed(2),
        is_active: t.is_active,
      };
    });

    setDrafts(nextDrafts);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
  void Promise.resolve().then(loadTickets);
}, [loadTickets]);


  async function persistTicket(id: string) {
    const draft = drafts[id];
    if (!draft) return;

    await fetch("/api/admin/tickets/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: draft.name,
        price_pence: Math.round(Number(draft.price) * 100),
        is_active: draft.is_active,
      }),
    });
  }

  async function createTicket() {
    if (!newName || !newPrice) {
      setError("Name and price required");
      return;
    }

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

    await loadTickets();
    setSubmitting(false);
  }

  if (loading) return <p>Loading ticket types…</p>;

  return (
    <div className="mt-10 space-y-8">
      <h2 className="text-xl font-semibold">Ticket Types & Pricing</h2>

      {/* EXISTING */}
      {tickets.map((t) => {
        const draft = drafts[t.id];
        if (!draft) return null;

        return (
          <div
            key={t.id}
            className={`border rounded-lg p-4 space-y-3 ${
              t.is_default
                ? "bg-blue-50 border-blue-300"
                : "bg-white"
            }`}
          >
            {t.is_default && (
              <div className="text-xs font-medium text-blue-700">
                Base ticket (General Admission)
              </div>
            )}

            <input
              className="border rounded px-3 py-2 w-full"
              value={draft.name}
              disabled={t.is_default}
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
              className="border rounded px-3 py-2 w-full"
              value={draft.price}
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

      {/* CREATE NEW */}
      <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
        <h3 className="font-medium">Add ticket type</h3>

        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Ticket name (e.g. Wine + Drink)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />

        <input
          type="number"
          step="0.01"
          className="border rounded px-3 py-2 w-full"
          placeholder="Price (£)"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
        />

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
          disabled={submitting}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add ticket"}
        </button>
      </div>
    </div>
  );
}
