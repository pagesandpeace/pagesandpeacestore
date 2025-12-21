"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

import Image from "next/image";

/* ----------------------------------------------
   TYPES MATCHING PAGE.TSX
---------------------------------------------- */

type EventItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  short_description?: string | null;
  description?: string | null;
  date: string;
  capacity: number;
  price_pence: number;
  image_url?: string | null;
  store_id: string;
  published: boolean;
};

type StoreItem = {
  id: string;
  name: string;
};

/* ----------------------------------------------
   COMPONENT
---------------------------------------------- */

export default function EditEventForm({
  event,
  stores,
}: {
  event: EventItem;
  stores: StoreItem[];
}) {
  const router = useRouter();

  const [title, setTitle] = useState(event.title);
  const [subtitle, setSubtitle] = useState(event.subtitle || "");
  const [shortDescription, setShortDescription] = useState(event.short_description || "");
  const [description, setDescription] = useState(event.description || "");
  const [date, setDate] = useState(event.date.slice(0, 16));
  const [capacity, setCapacity] = useState(event.capacity);
  const [price, setPrice] = useState(event.price_pence / 100);
  const [published, setPublished] = useState(event.published);
  const [storeId, setStoreId] = useState(event.store_id);

  const [imageUrl, setImageUrl] = useState(event.image_url || "");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/admin/events/upload-image", {
      method: "POST",
      body: form,
    });

    const data = await res.json();

    if (!res.ok) {
      setErrorMsg(data.error || "Image upload failed.");
      setUploading(false);
      return;
    }

    setImageUrl(data.url);
    setUploading(false);
  }

  async function handleSubmit() {
    setSubmitting(true);

    const payload = {
      id: event.id,
      title,
      subtitle,
      short_description: shortDescription,
      description,
      date,
      capacity,
      price_pence: Math.round(price * 100),
      image_url: imageUrl,
      store_id: storeId,
      published,
    };

    const res = await fetch("/api/admin/events/update", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("UPDATE FAILED:", errText);
      setErrorMsg("Failed to update event.");
      setSubmitting(false);
      return;
    }

    router.push(`/admin/events/${event.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Edit Event</h1>

      <div className="space-y-6">
        {errorMsg && <Alert type="error" message={errorMsg} />}

        {/* TITLE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {/* SUBTITLE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Subtitle</label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </div>

        {/* SHORT DESCRIPTION */}
        <div>
          <label className="block mb-1 text-sm font-medium">Short Description</label>
          <TextArea
            rows={3}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block mb-1 text-sm font-medium">Description</label>
          <TextArea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* DATE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Event Date *</label>
          <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* STORE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Store *</label>
          <select
            className="border rounded-md px-3 py-2 w-full"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            {stores.map((s: StoreItem) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* IMAGE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Event Image</label>

          {imageUrl && (
            <div className="mb-3">
              <Image
                src={imageUrl}
                alt="Current image"
                width={300}
                height={300}
                className="object-cover rounded-lg border shadow"
              />
            </div>
          )}

          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            <p className="text-sm font-medium">Replace image</p>
          </label>

          {uploading && <p>Uploading...</p>}
        </div>

        {/* CAPACITY */}
        <div>
          <label className="block mb-1 text-sm font-medium">Capacity</label>
          <Input
            type="number"
            value={capacity}
            min={1}
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

        {/* PUBLISHED */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          <span className="text-sm">Published</span>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-4 pt-6">
          <Button variant="primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Saving…" : "Save Changes"}
          </Button>

          <Button variant="neutral" onClick={() => router.push(`/admin/events/${event.id}`)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
