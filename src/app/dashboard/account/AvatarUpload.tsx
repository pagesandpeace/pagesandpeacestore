"use client";

import { useState } from "react";
import Image from "next/image";

export default function AvatarUpload({ currentImage }: { currentImage?: string }) {
  const [preview, setPreview] = useState(currentImage || "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/avatar", { method: "PATCH", body: formData });
      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Avatar updated!");
        setPreview(data.imageUrl);

        // ✅ Fire an event for instant sidebar update (same tab)
        window.dispatchEvent(new CustomEvent("avatar-updated", { detail: data.imageUrl }));

        // ✅ Also trigger for other open tabs
        localStorage.setItem("userAvatarUpdated", Date.now().toString());
      } else {
        setMessage("❌ Upload failed. Try again.");
      }
    } catch {
      setMessage("❌ Something went wrong.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-24 h-24 rounded-full overflow-hidden border border-[#ccc]">
        <Image
          src={preview || "/user_avatar_placeholder.svg"}
          alt="Avatar preview"
          fill
          className="object-cover"
        />
      </div>

      <label className="text-sm text-[#5DA865] font-medium cursor-pointer hover:underline">
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        Choose new photo
      </label>

      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="px-6 py-2 rounded-full bg-[#5DA865] text-[#FAF6F1] text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Save Avatar"}
        </button>
      )}

      {message && (
        <p
          className={`text-sm mt-2 ${
            message.startsWith("✅") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
