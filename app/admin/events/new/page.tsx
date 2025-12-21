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

  // FORM STATE
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");

  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState(10);
  const [price, setPrice] = useState(0);
  const [published, setPublished] = useState(true);

  const [stores, setStores] = useState<Store[]>([]);

  const [storeId, setStoreId] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* -------------------------------
     LOAD STORES — WITH COOKIES
  -------------------------------- */
  useEffect(() => {
    async function loadStores() {
      try {
        const res = await fetch("/api/admin/stores/list", {
          method: "GET",
          cache: "no-store",
          credentials: "include", // 🔥 REQUIRED OR auth = null in route
        });

        console.log("STORE FETCH STATUS:", res.status);

        if (!res.ok) {
          console.error("Store fetch failed:", await res.text());
          return;
        }

        const data = await res.json();
        console.log("STORES RECEIVED:", data);

        setStores(data);
      } catch (err) {
        console.error("Store fetch error:", err);
      }
    }

    loadStores();
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

    const uploadRes = await fetch("/api/admin/events/upload-image", {
      method: "POST",
      body: form,
      credentials: "include", // optional, but added for consistency
    });

    const data = await uploadRes.json();

    if (!uploadRes.ok) {
      setUploading(false);
      setErrorMsg(data.error || "Image upload failed.");
      return;
    }

    setImageUrl(data.url);
    setUploading(false);
  }

 /* -------------------------------
   SUBMIT FORM — SEND SESSION
-------------------------------- */
async function handleSubmit() {
  setSubmitting(true);
  setErrorMsg(null);

  if (!title || !date || !storeId) {
    setSubmitting(false);
    setErrorMsg("Please fill all required fields.");
    return;
  }

  const payload = {
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

  console.log("🚀 SENDING EVENT CREATE PAYLOAD:", payload);

  const res = await fetch("/api/admin/events/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // 🔥 REQUIRED — sends Supabase session cookies
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("EVENT CREATE FAILED:", errText);
    setSubmitting(false);
    setErrorMsg("Failed to create event.");
    return;
  }

  console.log("✅ EVENT CREATED");

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
          >
            <option value="">Select a store…</option>

            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {stores.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              No stores loaded. Check API route.
            </p>
          )}
        </div>

        {/* IMAGE UPLOADER */}
        <div>
          <label className="block mb-1 text-sm font-medium">Event Image</label>

          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
            <div className="flex flex-col items-center pt-5 pb-6 text-gray-500">
              <svg
                aria-hidden="true"
                className="w-8 h-8 mb-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 15a4 4 0 014-4h10a4 4 0 014 4v4H3v-4zM7 11l5-5m0 0l5 5m-5-5v12"
                ></path>
              </svg>

              <p className="text-sm font-medium">Upload event image</p>
              <p className="text-xs">PNG, JPG • under 5MB</p>
            </div>

            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleUpload}
            />
          </label>

          {uploading && <p className="text-sm mt-2">Uploading…</p>}

          {imageUrl && (
            <div className="mt-3">
              <Image
                src={imageUrl}
                alt="Preview"
                width={300}
                height={300}
                className="object-cover rounded-lg border shadow"
              />
            </div>
          )}
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
          <label className="block mb-1 text-sm font-medium">
            Price (£) — leave 0 for free
          </label>
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
