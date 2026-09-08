"use client";

import { ChangeEvent, useState } from "react";

type Props = { initialUrl?: string | null };

export function EventImageUpload({ initialUrl = null }: Props) {
  const [imageUrl, setImageUrl] = useState(initialUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/app-core/admin/event-image", { method: "POST", body });
      const payload = (await response.json().catch(() => ({}))) as { imageUrl?: string; error?: string };
      if (!response.ok || !payload.imageUrl) throw new Error(payload.error ?? "Upload failed");
      setImageUrl(payload.imageUrl);
      setMessage("Image uploaded. Save the event to use it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  return <div className="space-y-3">
    <input type="hidden" name="image_url" value={imageUrl} />
    {imageUrl ? <img src={imageUrl} alt="Event image preview" className="h-48 w-full rounded-xl border object-cover" /> : <div className="flex h-36 items-center justify-center rounded-xl border border-dashed text-sm text-foreground/55">No event image selected</div>}
    <div className="flex flex-wrap items-center gap-3">
      <label className="cursor-pointer rounded-lg border border-black/15 px-4 py-2 text-sm font-semibold hover:bg-black/5">
        {uploading ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploading} onChange={upload} />
      </label>
      {imageUrl ? <button type="button" className="text-sm underline underline-offset-4" onClick={() => { setImageUrl(""); setMessage("Image removed. Save the event to apply this change."); }}>Remove image</button> : null}
      <span className="text-xs text-foreground/55">JPG, PNG, WebP or AVIF · up to 8 MB</span>
    </div>
    {message ? <p className="text-sm text-foreground/70" role="status">{message}</p> : null}
  </div>;
}
