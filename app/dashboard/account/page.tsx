"use client";

import { useState } from "react";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { useUser } from "@/hooks/useUser";

export default function AccountPage() {
  const { user } = useUser();
  const supabase = supabaseBrowser();

  const [tab, setTab] = useState<"profile" | "security">("profile");

  /**
   * IMPORTANT:
   * We deliberately do NOT initialise these from `user`
   * because `user` refreshes after avatar/name updates.
   * Instead, we fall back to `user` at render time.
   */
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [editingName, setEditingName] = useState<string>("");

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  /* --------------------------------------------------------
     AVATAR UPLOAD
  --------------------------------------------------------- */
  async function handleAvatarChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optimistic preview
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

    // Persist Cloudinary URL immediately
    setAvatarPreview(data.imageUrl);
    setSaveMessage("Saved ✓");

    // Force global user re-fetch (sidebar + navbar)
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
     UPDATE PASSWORD
  --------------------------------------------------------- */
  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordMessage(error.message);
    } else {
      setPasswordMessage("Password updated successfully.");
      setNewPassword("");
    }

    setTimeout(() => setPasswordMessage(""), 3000);
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
          Manage your profile and account settings.
        </p>

        {/* Tabs */}
        <div className="flex gap-3 mb-8">
          <Button
            size="sm"
            variant={tab === "profile" ? "primary" : "outline"}
            onClick={() => setTab("profile")}
          >
            Profile
          </Button>

          <Button
            size="sm"
            variant={tab === "security" ? "primary" : "outline"}
            onClick={() => setTab("security")}
          >
            Security
          </Button>
        </div>

        {/* ---------------------------------------
            PROFILE TAB
        ---------------------------------------- */}
        {tab === "profile" && (
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
        )}

        

{tab === "security" && (
  <Card>
    <CardHeader>
      <h2 className="text-lg font-semibold">
        Password & Security
      </h2>
    </CardHeader>

    <CardBody className="space-y-4">
      {/* Password display (masked, non-editable) */}
      <div>
        <p className="text-xs uppercase tracking-wide text-[#777]">
          Password
        </p>

        <Input
          type="password"
          value="••••••••••••"
          disabled
          className="mt-1 bg-[#f3f3f3] cursor-not-allowed"
        />
      </div>

      {/* Action */}
      <Button
        size="md"
        className="w-full"
        onClick={async () => {
          if (!user?.email) return;

          const { error } =
            await supabase.auth.resetPasswordForEmail(
              user.email,
              {
                redirectTo: `${window.location.origin}/reset-password`,
              }
            );

          if (error) {
            setPasswordMessage(error.message);
          } else {
            setPasswordMessage(
              "We’ve sent you an email with a secure link to reset your password."
            );
          }

          setTimeout(() => setPasswordMessage(""), 5000);
        }}
      >
        Send password reset email
      </Button>

      {/* Feedback */}
      {passwordMessage && (
        <p className="text-sm text-green-700">
          {passwordMessage}
        </p>
      )}
    </CardBody>
  </Card>
)}

      </div>
    </main>
  );
}
