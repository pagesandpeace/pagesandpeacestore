"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import ImageCropper from "@/components/admin/marketing/ImageCropper";

type MarketingBlock = {
  id: string | null;
  key: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image_url: string | null;
  visible: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export default function AdminMarketingPage() {
  const [block, setBlock] = useState<MarketingBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [replaceImage, setReplaceImage] = useState(false);

  // NEW — store the file that should open inside the cropper modal
  const [croppingFile, setCroppingFile] = useState<File | null>(null);

  /* ------------------------------------------------------------------
      LOAD HERO BLOCK
  ------------------------------------------------------------------ */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/marketing/shop-hero", {
          cache: "no-store",
        });
        const data = await res.json();
        setBlock(data);
      } catch (err) {
        console.error("Failed to load hero block:", err);
      }
      setLoading(false);
    }

    load();
  }, []);

  /* ------------------------------------------------------------------
      SAVE BLOCK
  ------------------------------------------------------------------ */
  async function save() {
    if (!block) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing/shop-hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(block),
      });

      if (!res.ok) throw new Error("Failed to save");

      alert("Hero banner updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to save hero banner");
    }
    setSaving(false);
  }

  /* ------------------------------------------------------------------
      UPLOAD CROPPED IMAGE → Cloudinary
  ------------------------------------------------------------------ */
  async function uploadImage(file: File) {
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/admin/marketing/upload-image", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setBlock((prev) =>
        prev ? { ...prev, image_url: data.url } : prev
      );
      setReplaceImage(false);
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Image upload failed");
    }

    setUploading(false);
  }

  if (loading || !block) {
    return <main className="p-10">Loading…</main>;
  }

  /* ------------------------------------------------------------------
      RENDER
  ------------------------------------------------------------------ */
  return (
    <main className="max-w-3xl mx-auto py-12 space-y-10 relative">

      <h1 className="text-4xl font-bold">Marketing – Shop Hero Banner</h1>
      <p className="text-neutral-600">Control the hero banner on the Shop page.</p>

      {/* ---------------------------------
          Preview section
      ---------------------------------- */}
      <section className="bg-white rounded-xl shadow overflow-hidden">
        <div className="relative w-full h-64">
          {block.image_url ? (
            <Image
              src={block.image_url}
              alt="Hero Preview"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <p className="text-gray-600">No image</p>
            </div>
          )}
        </div>

        <div className="p-6 space-y-1">
          <h2 className="text-2xl font-bold">{block.title}</h2>
          <p className="text-neutral-700">{block.subtitle}</p>

          {block.cta_text && (
            <a
              href={block.cta_link}
              className="text-blue-600 underline font-semibold"
            >
              {block.cta_text}
            </a>
          )}
        </div>
      </section>

      {/* ---------------------------------
          Editor form
      ---------------------------------- */}
      <section className="bg-white p-6 rounded-xl shadow space-y-6">

        {/* Title */}
        <div>
          <label className="font-semibold block mb-1">Title</label>
          <input
            className="w-full p-2 border rounded"
            value={block.title}
            onChange={(e) => setBlock({ ...block, title: e.target.value })}
          />
        </div>

        {/* Subtitle */}
        <div>
          <label className="font-semibold block mb-1">Subtitle</label>
          <textarea
            className="w-full p-3 border rounded"
            value={block.subtitle}
            onChange={(e) => setBlock({ ...block, subtitle: e.target.value })}
          />
        </div>

        {/* CTA Text */}
        <div>
          <label className="font-semibold block mb-1">CTA Text</label>
          <input
            className="w-full p-2 border rounded"
            value={block.cta_text}
            onChange={(e) => setBlock({ ...block, cta_text: e.target.value })}
          />
        </div>

        {/* CTA Link */}
        <div>
          <label className="font-semibold block mb-1">CTA Link</label>
          <input
            className="w-full p-2 border rounded"
            value={block.cta_link}
            onChange={(e) => setBlock({ ...block, cta_link: e.target.value })}
          />
        </div>

        {/* Image upload */}
        <div>
          <label className="font-semibold block mb-2">Hero Image</label>

          {block.image_url && !replaceImage && (
            <>
              <Image
                src={block.image_url}
                width={400}
                height={200}
                alt="Hero"
                className="rounded mb-3"
              />

              <Button
                variant="outline"
                onClick={() => setReplaceImage(true)}
                className="mb-3"
              >
                Replace Image
              </Button>
            </>
          )}

          {(replaceImage || !block.image_url) && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setCroppingFile(e.target.files[0]); // send image → cropper
                }
              }}
            />
          )}

          {uploading && <p className="text-sm text-blue-600 mt-2">Uploading…</p>}
        </div>

        {/* Visibility */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={block.visible}
            onChange={(e) => setBlock({ ...block, visible: e.target.checked })}
          />
          <span>Banner visible</span>
        </div>

        {/* Start date */}
        <div>
          <label className="font-semibold block mb-1">Show From</label>
          <input
            type="datetime-local"
            className="w-full p-2 border rounded"
            value={block.starts_at ?? ""}
            onChange={(e) =>
              setBlock({ ...block, starts_at: e.target.value || null })
            }
          />
        </div>

        {/* End date */}
        <div>
          <label className="font-semibold block mb-1">Show Until</label>
          <input
            type="datetime-local"
            className="w-full p-2 border rounded"
            value={block.ends_at ?? ""}
            onChange={(e) =>
              setBlock({ ...block, ends_at: e.target.value || null })
            }
          />
        </div>

        {/* Save button */}
        <Button
          className="w-full py-3 text-lg"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </section>

      {/* ---------------------------------
          CROPPER MODAL (OVERLAY)
      ---------------------------------- */}
      {croppingFile && (
        <ImageCropper
          file={croppingFile}
          onCancel={() => setCroppingFile(null)}
          onComplete={async (blob) => {
            const croppedFile = new File([blob], "cropped.jpg", {
              type: "image/jpeg",
            });

            setCroppingFile(null);
            await uploadImage(croppedFile);
          }}
        />
      )}
    </main>
  );
}
