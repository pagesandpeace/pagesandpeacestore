"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const dynamicParams = true;

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

import { getCurrentUserClient } from "@/lib/auth/client";

export default function CreateEventPage() {
  const router = useRouter();

  // Admin guard
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean>(false);

  useEffect(() => {
    async function check() {
      const user = await getCurrentUserClient();

      if (!user) {
        router.push("/sign-in");
        return;
      }

      if (user.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      setAllowed(true);
      setLoading(false);
    }

    check();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <p>Loading…</p>
      </div>
    );
  }

  if (!allowed) return null;

  // Form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState<number>(10);
  const [price, setPrice] = useState<number>(0);
  const [description, setDescription] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submitHandler() {
    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      title,
      description,
      date,
      capacity,
      pricePence: Math.round(price * 100),
    };

    const res = await fetch("/api/admin/events/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setSubmitting(false);
      setErrorMsg("Failed to create event. Please check your inputs.");
      return;
    }

    router.push("/admin/events");
  }

  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Create New Event</h1>

      <div className="space-y-6">
        {errorMsg && <Alert type="error" message={errorMsg} />}

        {/* TITLE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Title</label>
          <Input
            placeholder="Book Club: November Edition"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTitle(e.target.value)
            }
          />
        </div>

        {/* DATE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Date & Time</label>
          <Input
            type="datetime-local"
            value={date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDate(e.target.value)
            }
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block mb-1 text-sm font-medium">Description</label>
          <TextArea
            rows={4}
            placeholder="Describe the event (this is shown to customers)"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setDescription(e.target.value)
            }
          />
        </div>

        {/* CAPACITY */}
        <div>
          <label className="block mb-1 text-sm font-medium">Capacity</label>
          <Input
            type="number"
            min={1}
            value={capacity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCapacity(Number(e.target.value))
            }
          />
        </div>

        {/* PRICE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Price (£)</label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPrice(Number(e.target.value))
            }
          />
        </div>

        {/* ACTIONS */}
        <div className="flex gap-4 pt-6">
          <Button
            variant="primary"
            size="md"
            disabled={submitting}
            onClick={submitHandler}
          >
            {submitting ? "Creating…" : "Create Event"}
          </Button>

          <Button
            variant="neutral"
            size="md"
            onClick={() => router.push("/admin/events")}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
