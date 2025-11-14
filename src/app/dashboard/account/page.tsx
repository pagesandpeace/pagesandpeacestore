// src/app/dashboard/account/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ✔ Correct client-side import
import { getCurrentUserClient } from "@/lib/auth/client";

import { Button } from "@/components/ui/Button";

type User = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
};

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [message, setMessage] = useState("");

  /* ----------------------------------------------
   * Load current user (CLIENT)
   * -------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await getCurrentUserClient();
        setUser(res ?? null);
        setPreview(res?.image || "");
      } catch (err) {
        console.error("Error loading user:", err);
      }
    })();
  }, []);

  /* ----------------------------------------------
   * Upload avatar
   * -------------------------------------------- */
  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setMessage("");
    setSavedTick(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/user/avatar", {
        method: "PATCH",
        body: formData,
      });

      const data: { success?: boolean; imageUrl?: string; error?: string } =
        await res.json();

      if (res.ok && data.imageUrl) {
        setPreview(data.imageUrl);
        setMessage("✅ Avatar updated");

        // Notify other tabs + components
        window.dispatchEvent(new CustomEvent("avatar-updated", { detail: data.imageUrl }));
        localStorage.setItem("userAvatarUpdated", Date.now().toString());

        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 2000);
      } else {
        setMessage(data.error || "❌ Upload failed. Try again.");
      }
    } catch {
      setMessage("❌ Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  /* ----------------------------------------------
   * Handle file input
   * -------------------------------------------- */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    uploadAvatar(file);
  };

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-6 md:px-8 py-10 md:py-16">
      <section className="mx-auto w-full max-w-5xl">
        <header className="pb-6 border-b border-[#dcd6cf]">
          <h1 className="text-3xl font-semibold tracking-widest">My Account ☕</h1>
          <p className="text-[#111]/70 mt-2 text-sm">Manage your profile and preferences.</p>

          <nav className="mt-5 flex gap-2">
            <Link
              href="/dashboard/account"
              className="inline-flex items-center rounded-full border-2 border-[var(--accent)] text-[var(--accent)] px-4 py-1.5 text-sm font-semibold hover:border-[var(--secondary)] hover:text-[var(--secondary)] transition-all"
            >
              Profile
            </Link>
            <Link
              href="/dashboard/account/security"
              className="inline-flex items-center rounded-full border-2 border-[var(--accent)] text-[var(--accent)] px-4 py-1.5 text-sm font-semibold hover:border-[var(--secondary)] hover:text-[var(--secondary)] transition-all"
            >
              Security
            </Link>
          </nav>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-2">

          {/* ---------- Profile Photo ---------- */}
          <div className="rounded-xl border border-[#e0dcd6] bg-white shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Profile Photo</h2>

            <div className="flex items-center gap-5">
              <div className="relative h-20 w-20 rounded-full overflow-hidden border border-[#ccc] bg-[#f6f3ef]">
                <Image
                  src={preview || "/user_avatar_placeholder.svg"}
                  alt="Avatar preview"
                  fill
                  className="object-cover"
                />

                {uploading && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}

                {savedTick && !uploading && (
                  <div className="absolute -bottom-1 -right-1 bg-[#2f7c3e] text-white text-[10px] px-2 py-0.5 rounded-full">
                    Saved ✓
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-[var(--accent)] font-medium cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <span className="underline hover:text-[var(--secondary)] transition">Choose new photo</span>
                </label>
                <p className="text-xs text-[#777]">JPG/PNG, ~2–5MB recommended.</p>
              </div>
            </div>

            {message && (
              <p className={`mt-4 text-sm ${message.startsWith("✅") ? "text-green-700" : "text-red-600"}`}>
                {message}
              </p>
            )}
          </div>

          {/* ---------- Profile Details ---------- */}
          <div className="rounded-xl border border-[#e0dcd6] bg-white shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Profile Details</h2>

            <dl className="space-y-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-[#777]">Name</dt>
                <dd className="mt-1 text-sm">{user?.name || "—"}</dd>
              </div>

              <div className="border-t border-[#eee] pt-4">
                <dt className="text-xs uppercase tracking-wide text-[#777]">Email</dt>
                <dd className="mt-1 text-sm">{user?.email || "—"}</dd>
              </div>
            </dl>

            <div className="mt-6">
              <Link href="/dashboard/account/security">
                <Button variant="outline" size="md" className="w-full">
                  Change Password →
                </Button>
              </Link>
            </div>
          </div>

        </div>

        <div className="mt-6 rounded-xl border border-dashed border-[#e0dcd6] bg-white/60 p-6 text-sm text-[#555]">
          <p className="font-medium mb-1">Preferences & Community</p>
          <p>Personalised reading interests and community features are coming soon.</p>
        </div>
      </section>
    </main>
  );
}
