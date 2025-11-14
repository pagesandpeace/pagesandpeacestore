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

  // ⭐ HOOKS MUST BE AT THE TOP — ALWAYS
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState<number>(10);
  const [price, setPrice] = useState<number>(0);
  const [description, setDescription] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ---------------------------------------------------
     ADMIN CHECK
  --------------------------------------------------- */
  useEffect(() => {
    async function load() {
      const u = await getCurrentUserClient();
      setUser(u);
      setLoading(false);

      if (!u) {
        router.replace("/sign-in");
        return;
      }

      if (u.role !== "admin") {
        router.replace("/dashboard");
        return;
      }
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <p>Loading…</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null; // router is redirecting
  }

  /* ---------------------------------------------------
     SUBMIT HANDLER
  --------------------------------------------------- */
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

  /* ---------------------------------------------------
     RENDER PAGE
  --------------------------------------------------- */
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
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* DATE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Date & Time</label>
          <Input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block mb-1 text-sm font-medium">Description</label>
          <TextArea
            rows={4}
            placeholder="Describe the event (this is shown to customers)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* CAPACITY */}
        <div>
          <label className="block mb-1 text-sm font-medium">Capacity</label>
          <Input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
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
            onChange={(e) => setPrice(Number(e.target.value))}
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
