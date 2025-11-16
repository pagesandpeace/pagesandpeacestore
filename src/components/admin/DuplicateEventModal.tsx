"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type DuplicateEventModalProps = {
  event: {
    id: string;
    title: string;
    subtitle: string | null;
    shortDescription: string | null;
    description: string;
    date: string;
    capacity: number;
    pricePence: number;
    imageUrl: string | null;
    storeId: string;
    published: boolean;
  };
  categoryIds: string[];
};

export default function DuplicateEventModal({
  event,
  categoryIds,
}: DuplicateEventModalProps) {
  const [open, setOpen] = useState(false);

  const defaultTitle = `${event.title} (Copy)`;

  const [newTitle, setNewTitle] = useState(defaultTitle);
  const [newDate, setNewDate] = useState("");
  const [newPrice, setNewPrice] = useState(event.pricePence / 100);
  const [newCapacity, setNewCapacity] = useState(event.capacity);
  const [loading, setLoading] = useState(false);

  async function handleDuplicate() {
    setLoading(true);

    // Close modal immediately for better UX
    setOpen(false);

    const res = await fetch("/api/admin/events/duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalEventId: event.id,
        title: newTitle,
        date: newDate,
        pricePence: Math.round(newPrice * 100),
        capacity: newCapacity,
        categoryIds,
      }),
    });

    const json = await res.json();

    // Always redirect to admin/events (NOT the individual event page)
    window.location.href = "/admin/events";
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Duplicate Event
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-lg p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Duplicate Event</h2>

            {/* Title */}
            <label className="text-sm font-medium">New Title</label>
            <input
              className="w-full border p-2 rounded mb-4"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />

            {/* Date */}
            <label className="text-sm font-medium">New Date & Time</label>
            <input
              type="datetime-local"
              className="w-full border p-2 rounded mb-4"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />

            {/* Price */}
            <label className="text-sm font-medium">Price (£)</label>
            <input
              type="number"
              className="w-full border p-2 rounded mb-4"
              value={newPrice}
              onChange={(e) => setNewPrice(parseFloat(e.target.value))}
            />

            {/* Capacity */}
            <label className="text-sm font-medium">Capacity</label>
            <input
              type="number"
              className="w-full border p-2 rounded mb-6"
              value={newCapacity}
              onChange={(e) => setNewCapacity(parseInt(e.target.value))}
            />

            <div className="flex justify-end gap-3">
              <Button variant="neutral" onClick={() => setOpen(false)}>
                Cancel
              </Button>

              <Button onClick={handleDuplicate} disabled={loading}>
                {loading ? "Duplicating…" : "Create Duplicate"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
