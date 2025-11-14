"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export default function DeleteEventButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/events/${eventId}/delete`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("Failed to delete event");
        return;
      }

      router.push("/admin/events");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Delete Button */}
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 border-red-600 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        Delete Event
      </Button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[90%] max-w-md">
            <h2 className="text-xl font-semibold mb-2">Delete Event?</h2>
            <p className="text-neutral-700 mb-6">
              This action is permanent and will remove all bookings.
            </p>

            <div className="flex justify-end space-x-3">
              <Button variant="neutral" onClick={() => setOpen(false)}>
                Cancel
              </Button>

              <Button
                variant="outline"
                className="text-white bg-red-600 hover:bg-red-700 border-red-600"
                disabled={loading}
                onClick={handleDelete}
              >
                {loading ? "Deleting…" : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
