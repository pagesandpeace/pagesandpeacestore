"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

import Image from "next/image";

type Store = {
  id: string;
  name: string;
};

export default function CreateEventPage() {
  const router = useRouter();

  /* -------------------------------
     FORM STATE
  -------------------------------- */
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");

  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState(10);
  const [price, setPrice] = useState(0);
  const [published, setPublished] = useState(true);

  // ✅ NEW
  const [bookingType, setBookingType] = useState<"ticketed" | "interest">("ticketed");

  /* -------------------------------
     STORES
  -------------------------------- */
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");
  const [loadingStores, setLoadingStores] = useState(true);

  /* -------------------------------
     IMAGE
  -------------------------------- */
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  /* -------------------------------
     UI STATE
  -------------------------------- */
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* -------------------------------
     LOAD STORES
  -------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadStores() {
      try {
        const res = await fetch("/api/admin/stores/list", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) return;

        const data = await res.json();

        if (!cancelled) {
          setStores(data);
          if (data.length === 1) setStoreId(data[0].id);
        }
      } finally {
        if (!cancelled) setLoadingStores(false);
      }
    }

    loadStores();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------
     IMAGE UPLOAD
  -------------------------------- */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/admin/events/upload-image", {
      method: "POST",
      body: form,
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      setUploading(false);
      setErrorMsg(data.error || "Image upload failed.");
      return;
    }

    setImageUrl(data.url);
    setUploading(false);
  }

  /* -------------------------------
     SUBMIT
  -------------------------------- */
  async function handleSubmit() {
    setSubmitting(true);
    setErrorMsg(null);

    if (!title || !date || !storeId) {
      setSubmitting(false);
      setErrorMsg("Please fill all required fields.");
      return;
    }

    const isTicketed = bookingType === "ticketed";

    const payload = {
      title,
      subtitle,
      short_description: shortDescription,
      description,
      date,
      capacity,
      price_pence: isTicketed ? Math.round(price * 100) : 0, // ✅ FIX
      image_url: imageUrl,
      store_id: storeId,
      published,
      booking_type: bookingType, // ✅ NEW
    };

    const res = await fetch("/api/admin/events/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(await res.text());
      setSubmitting(false);
      setErrorMsg("Failed to create event.");
      return;
    }

    router.push("/admin/events");
  }

  /* -------------------------------
     UI
  -------------------------------- */
  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Create New Event</h1>

      <div className="space-y-6">
        {errorMsg && <Alert type="error" message={errorMsg} />}

        {/* EVENT TYPE */}
        <div>
          <label className="block mb-1 text-sm font-medium">
            Event Type *
          </label>

          <select
            className="border rounded-md px-3 py-2 w-full"
            value={bookingType}
            onChange={(e) =>
              setBookingType(e.target.value as "ticketed" | "interest")
            }
          >
            <option value="ticketed">Ticketed (paid event)</option>
            <option value="interest">Interest (no payment)</option>
          </select>
        </div>

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
          <TextArea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* DATE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Event Date *</label>
          <Input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* STORE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Store *</label>

          <select
            className="border rounded-md px-3 py-2 w-full"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            disabled={loadingStores}
          >
            <option value="">
              {loadingStores ? "Loading stores…" : "Select a store…"}
            </option>

            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* IMAGE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Event Image</label>

          <input type="file" accept="image/*" onChange={handleUpload} />

          {uploading && <p>Uploading…</p>}

          {imageUrl && (
            <Image
              src={imageUrl}
              alt="Preview"
              width={300}
              height={300}
              className="mt-3 rounded border"
            />
          )}
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

        {/* PRICE (ONLY IF TICKETED) */}
        {bookingType === "ticketed" && (
          <div>
            <label className="block mb-1 text-sm font-medium">
              Default Ticket Price (£)
            </label>

            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
        )}

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
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Event"}
          </Button>

          <Button variant="neutral" onClick={() => router.push("/admin/events")}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}