"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { useToast } from "@/components/ui/UseToast";

import { getCurrentUserClient } from "@/lib/auth/client";

import EventImageUploader from "@/components/admin/EventImageUploader";
import EventCategorySelector from "@/components/admin/EventCategorySelector";

type Store = { id: string; name: string; address: string };
type Category = { id: string; name: string; slug: string };

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Event fields
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState<number>(10);
  const [price, setPrice] = useState<number>(0);
  const [published, setPublished] = useState<boolean>(true);
  const [imageUrl, setImageUrl] = useState("");

  // Categories (full objects)
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  // Store / Location
  const [store, setStore] = useState<Store | null>(null);

  /* -------------------------------------------------------
     AUTH CHECK
  ------------------------------------------------------- */
  useEffect(() => {
    async function verifyRole() {
      const user = await getCurrentUserClient();

      if (!user) return router.replace("/sign-in");
      if (user.role !== "admin" && user.role !== "staff") {
        return router.replace("/dashboard");
      }
    }
    verifyRole();
  }, []);

  /* -------------------------------------------------------
     LOAD EVENT
  ------------------------------------------------------- */
  useEffect(() => {
    if (!eventId) return;

    let active = true;

    async function load() {
      try {
        const res = await fetch(`/api/admin/events/${eventId}`, {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Not found");

        const event = await res.json();
        if (!active) return;

        setTitle(event.title ?? "");
        setSubtitle(event.subtitle ?? "");
        setShortDescription(event.shortDescription ?? "");
        setDescription(event.description ?? "");

        /* -------------------------------------------------
           FIX: PREVENT TIMEZONE SHIFT
           Use raw DB value → remove Z → strip seconds
        ------------------------------------------------- */
        setDate(event.date.replace("Z", "").slice(0, 16));

        setCapacity(event.capacity);
        setPrice(event.pricePence / 100);
        setPublished(event.published);
        setImageUrl(event.imageUrl ?? "");

        setStore(event.store ?? null);
        setSelectedCategories(event.categories ?? []);

      } catch (err) {
        console.error("❌ Failed to load event:", err);
        toast({
          title: "Error loading event",
          description: "Unable to load event details.",
          variant: "destructive",
        });
        router.push("/admin/events");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [eventId]);

  /* -------------------------------------------------------
     SAVE HANDLER
  ------------------------------------------------------- */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        id: eventId,
        title,
        subtitle,
        shortDescription,
        description,
        date, // this is now the exact value typed
        capacity,
        pricePence: Math.round(price * 100),
        published,
        imageUrl,
        categoryIds: selectedCategories.map((c) => c.id),
      };

      const res = await fetch(`/api/admin/events/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        toast({
          title: "Error updating event",
          description: json.error || "Something went wrong.",
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
    } finally {
      setSaving(false);
    }
  }

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */
  if (loading) return <p className="text-center py-12">Loading…</p>;

  return (
    <div className="max-w-3xl mx-auto py-12 space-y-8">
      <h1 className="text-3xl font-bold">Edit Event</h1>

      <Card className="p-6 space-y-6">
        <form onSubmit={onSubmit} className="space-y-6">

          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <Label>Subtitle</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>

          <div>
            <Label>Short Description</Label>
            <TextArea
              rows={3}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
            />
          </div>

          <div>
            <Label>Full Description</Label>
            <TextArea
              rows={6}
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
            />
          </div>

          <div>
            <Label>Location</Label>
            <Input
              disabled
              value={store?.address || store?.name || "Unknown Location"}
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>

          <EventCategorySelector
            selected={selectedCategories}
            onChange={setSelectedCategories}
          />

          <div>
            <Label>Capacity</Label>
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </div>

          <div>
            <Label>Price (£)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            <span>Published</span>
          </div>

          <EventImageUploader imageUrl={imageUrl} setImageUrl={setImageUrl} />

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
