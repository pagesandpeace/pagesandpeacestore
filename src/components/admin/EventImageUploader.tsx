"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

type Props = {
  imageUrl: string;
  setImageUrl: (url: string) => void;
};

export default function EventImageUploader({ imageUrl, setImageUrl }: Props) {
  const [uploading, setUploading] = useState(false);

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

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Failed to upload image");
      setUploading(false);
      return;
    }

    setImageUrl(json.url);
    setUploading(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Event Image</p>

      {imageUrl && (
        <div>
          <Image
            src={imageUrl}
            alt="Event"
            width={600}
            height={350}
            className="rounded-lg border shadow-sm object-cover"
          />
          <Button
            type="button"
            variant="neutral"
            className="mt-3"
            onClick={() => setImageUrl("")}
          >
            Remove Image
          </Button>
        </div>
      )}

      <Button type="button" variant="outline">
        <label className="cursor-pointer">
          {uploading ? "Uploading…" : "Upload Image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </label>
      </Button>
    </div>
  );
}
