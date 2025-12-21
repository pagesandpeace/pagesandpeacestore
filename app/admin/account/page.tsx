"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { useUser } from "@/hooks/useUser";

export default function AdminAccountPage() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = supabaseBrowser();

  const [tab, setTab] = useState<"profile" | "security">("profile");

  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [editingName, setEditingName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  /* --------------------------------------------------------
     ADMIN GUARD
  --------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    if (user.role !== "admin") {
      router.replace("/");
    }
  }, [user, router]);

  /* Load user data */
  useEffect(() => {
    if (!user) return;

    queueMicrotask(() => {
      setAvatarPreview(user.image ?? "");
      setEditingName(user.name ?? "");
    });
  }, [user]);

  /* --------------------------------------------------------
     AVATAR UPLOAD
  --------------------------------------------------------- */
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
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

    if (!data.imageUrl) {
      setSaveMessage("Upload failed");
      return;
    }

    setSaveMessage("Saved ✓");
    setAvatarPreview(data.imageUrl);

    window.dispatchEvent(new Event("pp:user-should-refresh"));
    setTimeout(() => setSaveMessage(""), 2500);
  }

  /* --------------------------------------------------------
     SAVE NAME
  --------------------------------------------------------- */
  async function saveName() {
    if (!editingName.trim()) return;

    setSavingName(true);

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName }),
    });

    const data = await res.json();
    setSavingName(false);

    if (!data.success) {
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
     LOADING / FAIL SAFE
  --------------------------------------------------------- */
  if (!user || user.role !== "admin") {
    return (
      <main className="min-h-screen bg-[#FAF6F1] flex items-center justify-center">
        <p className="text-lg">Checking admin access…</p>
      </main>
    );
  }

  /* --------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-10 font-[Montserrat]">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-wide">
          Admin Account
        </h1>

        <p className="text-[#555] mt-1 mb-6">
          Manage your admin profile and security settings.
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

        {/* PROFILE */}
        {tab === "profile" && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Profile Photo</h2>
              </CardHeader>
              <CardBody>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border bg-white">
                    <Image
                      src={avatarPreview || "/user_avatar_placeholder.svg"}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
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

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Profile Info</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />

                  <Button
                    size="sm"
                    onClick={saveName}
                    disabled={savingName}
                  >
                    {savingName ? "Saving…" : "Save Name"}
                  </Button>

                  <p className="text-sm">{user.email}</p>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* SECURITY */}
        {tab === "security" && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Change Password</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={updatePassword} className="space-y-4">
                <Input
                  type="password"
                  placeholder="New password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                {passwordMessage && (
                  <p className="text-sm text-green-700">
                    {passwordMessage}
                  </p>
                )}

                <Button type="submit" className="w-full">
                  Update Password
                </Button>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  );
}
