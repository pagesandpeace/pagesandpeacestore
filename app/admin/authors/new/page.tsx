"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */

export default function CreateAuthorPage() {
  const router = useRouter();

  // FORM STATE
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shortBio, setShortBio] = useState("");
  const [bio, setBio] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* -------------------------------------------------------
     AUTO SLUG
  ------------------------------------------------------- */
  function handleNameChange(value: string) {
    setName(value);
    setSlug(slugify(value));
  }

  /* -------------------------------------------------------
     IMAGE UPLOAD (CLOUDINARY)
  ------------------------------------------------------- */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);

    const form = new FormData();
    form.append("file", file);

    const uploadRes = await fetch("/api/admin/authors/upload-image", {
      method: "POST",
      body: form,
      credentials: "include",
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

  /* -------------------------------------------------------
     SUBMIT (ADMIN API ROUTE)
  ------------------------------------------------------- */
  async function handleSubmit() {
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Author name is required.");
      return;
    }

    if (!slug.trim()) {
      setErrorMsg("Slug is required.");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/admin/authors/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // 🔥 REQUIRED
      body: JSON.stringify({
        name,
        slug,
        short_bio: shortBio,
        bio,
        profile_image_url: imageUrl,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      console.error("❌ CREATE AUTHOR ERROR:", data);
      setErrorMsg(data.error || "Failed to create author.");
      return;
    }

    router.push("/admin/authors");
  }

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */
  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">
        Add Author
      </h1>

      <div className="space-y-6">
        {errorMsg && <Alert type="error" message={errorMsg} />}

        {/* NAME */}
        <div>
          <label className="block mb-1 text-sm font-medium">
            Name *
          </label>
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Author name"
          />
        </div>

        {/* SLUG */}
        <div>
          <label className="block mb-1 text-sm font-medium">
            Slug *
          </label>
          <Input
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="author-slug"
          />
          <p className="text-xs text-neutral-500 mt-1">
            URL: /authors/{slug || "author-slug"}
          </p>
        </div>

        {/* SHORT BIO */}
        <div>
          <label className="block mb-1 text-sm font-medium">
            Short Bio
          </label>
          <TextArea
            rows={2}
            value={shortBio}
            onChange={(e) => setShortBio(e.target.value)}
            placeholder="Short introduction (optional)"
          />
        </div>

        {/* BIO */}
        <div>
          <label className="block mb-1 text-sm font-medium">
            Full Bio
          </label>
          <TextArea
            rows={5}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Full author biography (optional)"
          />
        </div>

        {/* IMAGE UPLOADER */}
        <div>
          <label className="block mb-1 text-sm font-medium">
            Profile Image
          </label>

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
                />
              </svg>

              <p className="text-sm font-medium">
                Upload profile image
              </p>
              <p className="text-xs">
                PNG, JPG • under 5MB
              </p>
            </div>

            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleUpload}
            />
          </label>

          {uploading && (
            <p className="text-sm mt-2">Uploading…</p>
          )}

          {imageUrl && (
            <div className="mt-3">
              <Image
                src={imageUrl}
                alt="Preview"
                width={160}
                height={160}
                className="rounded-full border object-cover"
              />
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-4 pt-6">
          <Button
            variant="primary"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Saving…" : "Save Author"}
          </Button>

          <Button
            variant="neutral"
            onClick={() => router.push("/admin/authors")}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
