"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { useToast } from "@/components/ui/UseToast";
import { getCurrentUserClient } from "@/lib/auth/client"; // NEW: ensure admin access

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;

  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState<number>(20);
  const [pricePence, setPricePence] = useState<number>(0);

  // -------------------------------------
  // ADMIN / STAFF ACCESS CHECK
  // -------------------------------------
  useEffect(() => {
    async function verifyRole() {
      const user = await getCurrentUserClient();

      if (!user || (user.role !== "admin" && user.role !== "staff")) {
        toast({
          title: "Access denied",
          description: "You do not have permission to edit events.",
          variant: "destructive",
        });
        router.push("/account");
      }
    }

    verifyRole();
  }, [router, toast]);

  // -------------------------------------
  // LOAD EXISTING EVENT DETAILS
  // -------------------------------------
  useEffect(() => {
    if (!eventId) return;

    async function load() {
      try {
        const res = await fetch(`/api/admin/events/${eventId}`);
        if (!res.ok) throw new Error("Failed to load");

        const data = await res.json();
        if (!data?.id) throw new Error("Event not found");

        setTitle(data.title);
        setDescription(data.description ?? "");
        setDate(new Date(data.date).toISOString().slice(0, 16));
        setCapacity(data.capacity);
        setPricePence(data.pricePence);
      } catch {
        toast({
          title: "Error loading event",
          description: "Unable to load event details.",
          variant: "destructive",
        });
        router.push("/admin/events");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [eventId, toast, router]);

  // -------------------------------------
  // SUBMIT UPDATE
  // -------------------------------------
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/events/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: eventId,
          title,
          description,
          date,
          capacity,
          pricePence,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast({
          title: "Error updating event",
          description: json?.error || "Something went wrong.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Saved",
        description: "Event updated successfully.",
        variant: "success",
      });

      router.push(`/admin/events/${eventId}`);
    } catch {
      toast({
        title: "Unexpected error",
        description: "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------
  // RENDER
  // -------------------------------------
  if (loading) {
    return <p className="text-center py-8">Loading event…</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Edit Event</h1>

      <Card className="p-6 space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <TextArea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <Label>Date & Time</Label>
            <Input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Capacity</Label>
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <Label>Price (pence)</Label>
            <Input
              type="number"
              min={0}
              value={pricePence}
              onChange={(e) => setPricePence(Number(e.target.value))}
              required
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
