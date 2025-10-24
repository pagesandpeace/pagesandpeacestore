"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth/actions";

export default function AccountPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      console.log("📡 [AccountPage] Fetching user...");
      const res = await getCurrentUser();
      console.log("✅ [AccountPage] User fetched:", res);
      setPreview(res?.image || "");
    };
    fetchUser();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    console.log("📁 [AccountPage] File selected:", f?.name, f?.size);
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    console.log("⬆️ [AccountPage] Uploading file...");
    const res = await fetch("/api/user/avatar", { method: "PATCH", body: formData });
    const data: { success?: boolean; imageUrl?: string; error?: string } = await res.json();
    console.log("📤 [AccountPage] API response:", data);

    if (res.ok && data.imageUrl) {
      setMessage("✅ Avatar updated!");
      setPreview(data.imageUrl);
      console.log("🎯 [AccountPage] Dispatching avatar-updated event:", data.imageUrl);

      window.dispatchEvent(new CustomEvent("avatar-updated", { detail: data.imageUrl }));
      localStorage.setItem("userAvatarUpdated", Date.now().toString());
    } else {
      setMessage("❌ Upload failed. Try again.");
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-8 py-16">
      <section className="max-w-4xl mx-auto space-y-10">
        <header className="border-b border-[#dcd6cf] pb-6">
          <h1 className="text-3xl font-semibold tracking-widest">My Account ☕</h1>
          <p className="text-[#111]/70 mt-2">
            Manage your profile, avatar, and preferences.
          </p>
        </header>

        {/* Avatar upload */}
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
              className="px-6 py-2 rounded-full bg-[#5DA865] text-[#FAF6F1] font-semibold text-sm hover:opacity-90 transition-all"
            >
              Save Avatar
            </button>
          )}

          {message && (
            <p className={`text-sm ${message.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
