"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const dynamicParams = true;

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { getCurrentUserClient } from "@/lib/auth/client";
import CategorySelector from "@/components/CategorySelector";

/* ------------------------------------------
   TYPES
------------------------------------------- */
type AdminUser = {
  id: string;
  role: string;
  email: string;
  name: string | null;
};

type Store = { 
  id: string; 
  name: string; 
  address: string; 
};

type Category = { id: string; name: string; slug: string };

/* ------------------------------------------
   CREATE EVENT PAGE
------------------------------------------- */
export default function CreateEventPage() {
  const router = useRouter();

  // AUTH
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // DROPDOWNS
  const [stores, setStores] = useState<Store[]>([]);

  // CATEGORY SELECTOR
  const [selectedCategoryObjects, setSelectedCategoryObjects] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // FORM
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState<number>(10);
  const [price, setPrice] = useState<number>(0);
  const [published, setPublished] = useState(true);

  const [selectedStore, setSelectedStore] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ------------------------------------------
     AUTH + LOAD STORES
  ------------------------------------------- */
  useEffect(() => {
    async function load() {
      const u = await getCurrentUserClient();
      setUser(u);
      setLoading(false);

      if (!u) return router.replace("/sign-in");
      if (u.role !== "admin") return router.replace("/dashboard");

      const storeRes = await fetch("/api/admin/stores/list");
      const storeData = await storeRes.json();
      setStores(storeData);
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

  if (!user || user.role !== "admin") return null;

  /* ------------------------------------------
     IMAGE UPLOADER
  ------------------------------------------- */
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
    });

    const data = await uploadRes.json();

    if (!uploadRes.ok) {
      setUploading(false);
      setErrorMsg(data.error || "Failed to upload image.");
      return;
    }

    setImageUrl(data.url);
    setUploading(false);
  }

  /* ------------------------------------------
     SUBMIT
  ------------------------------------------- */
  async function submitHandler() {
    setSubmitting(true);
    setErrorMsg(null);

    if (!selectedStore) {
      setSubmitting(false);
      setErrorMsg("Please select a store.");
      return;
    }

    const payload = {
      title,
      subtitle,
      shortDescription,
      description,
      date,
      capacity,
      pricePence: Math.round(price * 100),
      storeId: selectedStore,
      categoryIds: selectedCategories,
      imageUrl,
      published,
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

  /* ------------------------------------------
     UI
  ------------------------------------------- */
  const selectedStoreObj = stores.find((s) => s.id === selectedStore);

  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Create New Event</h1>

      <div className="space-y-6">
        {errorMsg && <Alert type="error" message={errorMsg} />}

        {/* TITLE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Title</label>
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
          <label className="block mb-1 text-sm font-medium">Date & Time</label>
          <Input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* STORE */}
        <div>
          <label className="block mb-1 text-sm font-medium">Store / Chapter</label>
          <select
            className="border rounded-md px-3 py-2 w-full"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
          >
            <option value="">Select a store…</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.address}
              </option>
            ))}
          </select>

          {selectedStoreObj && (
            <p className="text-xs text-gray-500 mt-1">
              <strong>Store Address:</strong> {selectedStoreObj.address}
            </p>
          )}
        </div>

        {/* CATEGORY SELECTOR */}
        <div>
          <label className="block mb-1 text-sm font-medium">Categories</label>

          <CategorySelector
            selected={selectedCategoryObjects}
            onChange={(cats) => {
              setSelectedCategoryObjects(cats);
              setSelectedCategories(cats.map((c) => c.id));
            }}
          />

          {/* POPULAR CATEGORY HINTS */}
          <div className="mt-3">
            <p className="text-xs text-gray-500">Popular categories:</p>

            <div className="flex flex-wrap gap-2 mt-1">
              {[
                "Silent Reading Night",
                "Poetry Night",
                "Book Club",
                "Kids Storytime",
                "Author Q&A",
                "Creative Writing Workshop",
                "Book Launch",
                "Fiction Night",
                "Wellbeing",
              ].map((name) => (
                <button
                  key={name}
                  type="button"
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md border"
                  onClick={async () => {
                    const res = await fetch("/api/admin/event-categories/create", {
                      method: "POST",
                      body: JSON.stringify({ name }),
                    });

                    const cat = await res.json();

                    if (!selectedCategoryObjects.some((c) => c.id === cat.id)) {
                      const updated = [...selectedCategoryObjects, cat];
                      setSelectedCategoryObjects(updated);
                      setSelectedCategories(updated.map((c) => c.id));
                    }
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
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
          <Button variant="primary" disabled={submitting} onClick={submitHandler}>
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
