"use client";

import { useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { useUser } from "@/hooks/useUser";

export default function AccountPage() {
  const { user } = useUser();

  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [editingName, setEditingName] = useState<string>("");

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [savingName, setSavingName] = useState(false);

  /* --------------------------------------------------------
     AVATAR UPLOAD
  --------------------------------------------------------- */
  async function handleAvatarChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/user/avatar", {
      method: "PATCH",
      body: formData,
    });

    const data = await res.json();
    setAvatarUploading(false);

    if (!data?.imageUrl) {
      setSaveMessage("Upload failed");
      return;
    }

    setAvatarPreview(data.imageUrl);
    setSaveMessage("Saved ✓");

    window.dispatchEvent(new Event("pp:user-should-refresh"));

    setTimeout(() => setSaveMessage(""), 2500);
  }

  /* --------------------------------------------------------
     SAVE NAME
  --------------------------------------------------------- */
  async function saveName() {
    const nameToSave = editingName.trim() || user?.name;
    if (!nameToSave) return;

    setSavingName(true);

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameToSave }),
    });

    const data = await res.json();
    setSavingName(false);

    if (!data?.success) {
      setSaveMessage("Name update failed");
      return;
    }

    setSaveMessage("Saved ✓");
    window.dispatchEvent(new Event("pp:user-should-refresh"));

    setTimeout(() => setSaveMessage(""), 2500);
  }

  /* --------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  if (!user) {
    return (
      <main className="min-h-screen bg-[#FAF6F1] flex items-center justify-center">
        <p className="text-lg">Please sign in to view your account.</p>
      </main>
    );
  }

  const displayAvatar =
    avatarPreview || user.image || "/user_avatar_placeholder.svg";

  const displayName =
    editingName || user.name || "";

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-10 md:px-10 font-[Montserrat]">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-wide">
          My Account
        </h1>
        <p className="text-[#555] mt-1 mb-6">
          Manage your profile.
        </p>

        <div
          key={user.id}
          className="grid gap-6 md:grid-cols-2"
        >
          {/* Avatar Card */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">
                Profile Photo
              </h2>
            </CardHeader>
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border bg-white">
                  <Image
                    src={displayAvatar}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />

                  {avatarUploading && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </div>

                <label className="cursor-pointer text-sm text-[var(--accent)] underline">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  Change photo
                </label>
              </div>

              {saveMessage && (
                <p className="mt-3 text-sm text-[#2f7c3e]">
                  {saveMessage}
                </p>
              )}
            </CardBody>
          </Card>

          {/* Profile Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">
                Profile Info
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#777]">
                  Name
                </p>

                <Input
                  value={displayName}
                  onChange={(e) =>
                    setEditingName(e.target.value)
                  }
                  className="mt-1"
                />

                <Button
                  className="mt-2"
                  size="sm"
                  onClick={saveName}
                  disabled={savingName}
                >
                  {savingName ? "Saving…" : "Save Name"}
                </Button>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-[#777]">
                  Email
                </p>
                <p className="text-sm break-all">
                  {user.email}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </main>
  );
}