"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

type MarketingBlock = {
  id: string;
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

export default function ShopHeroEditorPage() {
  const [block, setBlock] = useState<MarketingBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [replacingImage, setReplacingImage] = useState(false); // NEW

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/marketing/shop-hero");
      const data = await res.json();
      setBlock(data);
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    if (!block) return;
    setSaving(true);

    await fetch("/api/admin/marketing/shop-hero", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(block),
    });

    setSaving(false);
    alert("Hero banner updated!");
  }

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/admin/marketing/upload-image", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    setReplacingImage(false);
    setBlock((prev) => (prev ? { ...prev, image_url: data.url } : prev));
  }

  if (loading || !block) {
    return <main className="p-10">Loading…</main>;
  }

  return (
    <main className="max-w-3xl mx-auto py-12 space-y-8">
      <h1 className="text-4xl font-bold">Shop Hero Banner</h1>
      <p className="text-[var(--foreground)]/70">
        Update the hero banner on your main Shop page.
      </p>

      {/* Preview */}
      <div className="bg-white shadow rounded-xl overflow-hidden">
        <div className="relative w-full h-64">
          {block.image_url ? (
            <Image
              src={block.image_url}
              alt="Preview"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <span className="text-gray-500">No image selected</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-2">
          <h2 className="text-2xl font-bold">{block.title}</h2>
          <p className="text-[var(--foreground)]/80">{block.subtitle}</p>
          {block.cta_text && (
            <a
              href={block.cta_link}
              className="text-[var(--accent)] font-semibold underline"
            >
              {block.cta_text}
            </a>
          )}
        </div>
      </div>

      {/* FORM */}
      <div className="bg-white p-6 rounded-xl shadow space-y-6">
        {/* TEXT FIELDS */}
        <div>
          <label className="font-semibold block mb-1">Title</label>
          <input
            className="w-full p-2 border rounded"
            value={block.title}
            onChange={(e) => setBlock({ ...block, title: e.target.value })}
          />
        </div>

        <div>
          <label className="font-semibold block mb-1">Subtitle</label>
          <textarea
            className="w-full p-3 border rounded"
            value={block.subtitle}
            onChange={(e) => setBlock({ ...block, subtitle: e.target.value })}
          />
        </div>

        <div>
          <label className="font-semibold block mb-1">CTA Text</label>
          <input
            className="w-full p-2 border rounded"
            value={block.cta_text}
            onChange={(e) => setBlock({ ...block, cta_text: e.target.value })}
          />
        </div>

        <div>
          <label className="font-semibold block mb-1">CTA Link</label>
          <input
            className="w-full p-2 border rounded"
            value={block.cta_link}
            onChange={(e) => setBlock({ ...block, cta_link: e.target.value })}
          />
        </div>

        {/* HERO IMAGE */}
        <div>
          <label className="font-semibold block mb-2">Hero Image</label>

          {block.image_url && !replacingImage && (
            <>
              <Image
                src={block.image_url}
                width={400}
                height={200}
                alt="Hero"
                className="rounded mb-3"
              />

              {/* Replace button */}
              <Button
                variant="outline"
                className="mb-3"
                onClick={() => setReplacingImage(true)}
              >
                Replace Image
              </Button>
            </>
          )}

          {/* Upload input appears only when replacing */}
          {(replacingImage || !block.image_url) && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                e.target.files && uploadImage(e.target.files[0])
              }
            />
          )}
        </div>

        {/* Visibility Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={block.visible}
            onChange={(e) => setBlock({ ...block, visible: e.target.checked })}
          />
          <span>Banner visible</span>
        </div>

        {/* Scheduling */}
        <div>
          <label className="font-semibold block mb-1">Show From (optional)</label>
          <input
            type="datetime-local"
            className="w-full p-2 border rounded"
            value={block.starts_at ?? ""}
            onChange={(e) =>
              setBlock({ ...block, starts_at: e.target.value || null })
            }
          />
        </div>

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

        <Button onClick={save} disabled={saving} className="w-full py-3 text-lg">
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </main>
  );
}
