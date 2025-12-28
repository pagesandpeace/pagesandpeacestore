"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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

export default function EditAuthorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shortBio, setShortBio] = useState("");
  const [bio, setBio] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* -------------------------------------------------------
     LOAD AUTHOR
  ------------------------------------------------------- */
  useEffect(() => {
    if (!id) return;

    async function loadAuthor() {
      const res = await fetch(`/api/admin/authors/get?id=${id}`, {
        credentials: "include",
      });

      if (!res.ok) {
        setErrorMsg("Failed to load author.");
        setLoading(false);
        return;
      }

      const data = await res.json();

      setName(data.name);
      setSlug(data.slug);
      setShortBio(data.short_bio || "");
      setBio(data.bio || "");
      setImageUrl(data.profile_image_url || "");
      setLoading(false);
    }

    loadAuthor();
  }, [id]);

  /* -------------------------------------------------------
     IMAGE UPLOAD
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
     SAVE
  ------------------------------------------------------- */
  async function handleSave() {
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Author name is required.");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/admin/authors/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        id,
        name,
        slug,
        short_bio: shortBio,
        bio,
        profile_image_url: imageUrl,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setErrorMsg(data.error || "Failed to update author.");
      return;
    }

    router.push("/admin/authors");
  }

  if (loading) {
    return <p className="p-6">Loading…</p>;
  }

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */
  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">
        Edit Author
      </h1>

      <div className="space-y-6">
        {errorMsg && <Alert type="error" message={errorMsg} />}

        <div>
          <label className="block mb-1 text-sm font-medium">
            Name *
          </label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(slugify(e.target.value));
            }}
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">
            Slug
          </label>
          <Input
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">
            Short Bio
          </label>
          <TextArea
            rows={2}
            value={shortBio}
            onChange={(e) => setShortBio(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">
            Full Bio
          </label>
          <TextArea
            rows={5}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">
            Profile Image
          </label>

          <input type="file" accept="image/*" onChange={handleUpload} />

          {uploading && <p className="text-sm mt-2">Uploading…</p>}

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

        <div className="flex gap-4 pt-6">
          <Button
            variant="primary"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save Changes"}
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
