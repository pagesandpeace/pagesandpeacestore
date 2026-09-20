"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, CheckCircle2, LoaderCircle, MailCheck, MailX } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { useUser } from "@/hooks/useUser";

export default function AccountPage() {
  const { user, loading } = useUser();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [avatarPreview, setAvatarPreview] = useState("");
  const [editingName, setEditingName] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveKind, setSaveKind] = useState<"success" | "error" | "">("");
  const [savingName, setSavingName] = useState(false);
  const [marketingBusy, setMarketingBusy] = useState(false);
  const [marketingMessage, setMarketingMessage] = useState("");

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function showStatus(message: string, kind: "success" | "error") {
    setSaveMessage(message);
    setSaveKind(kind);
    window.setTimeout(() => {
      setSaveMessage("");
      setSaveKind("");
    }, 3500);
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showStatus("Please choose an image file.", "error");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      showStatus("Profile photos must be smaller than 4 MB.", "error");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setAvatarPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return localPreview;
    });
    setAvatarUploading(true);
    setSaveMessage("");
    setSaveKind("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/user/avatar", { method: "PATCH", body: formData });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.imageUrl) {
        showStatus(data?.error || "We could not update your profile photo.", "error");
        return;
      }

      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(data.imageUrl);
      showStatus("Profile photo updated successfully.", "success");
      window.dispatchEvent(new Event("pp:user-should-refresh"));
    } catch {
      showStatus("We could not update your profile photo.", "error");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function saveName() {
    const nameToSave = editingName.trim() || user?.name;
    if (!nameToSave) return;

    setSavingName(true);
    setSaveMessage("");
    setSaveKind("");

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameToSave }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        showStatus(data?.error || "Name update failed.", "error");
        return;
      }

      showStatus("Name updated successfully.", "success");
      window.dispatchEvent(new Event("pp:user-should-refresh"));
    } finally {
      setSavingName(false);
    }
  }

  async function subscribeToMarketing() {
    if (marketingBusy) return;
    setMarketingBusy(true);
    setMarketingMessage("");

    try {
      const response = await fetch("/api/user/marketing-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setMarketingMessage("We could not save your choice. Please try again.");
        return;
      }

      if (data.subscribed === true) {
        setMarketingMessage("You're signed up for Pages & Peace email updates ✓");
      } else {
        setMarketingMessage("Your consent was saved, but we could not complete the email subscription just now. Please try again later.");
      }

      window.dispatchEvent(new Event("pp:user-should-refresh"));
    } catch {
      setMarketingMessage("We could not save your choice. Please try again.");
    } finally {
      setMarketingBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-1 py-4 md:px-2 md:py-8">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-neutral-200" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="h-56 animate-pulse rounded-2xl bg-white" />
          <div className="h-56 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const displayAvatar = avatarPreview || user.image || "/user_avatar_placeholder.svg";
  const displayName = editingName || user.name || "";
  const subscribedToMarketing = user.marketingConsent === true && user.beehiivSubscribed === true;

  return (
    <div className="mx-auto max-w-4xl px-1 py-2 md:px-2 md:py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">My Account</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage your profile and preferences.</p>
      </div>

      {saveMessage ? (
        <div
          role="status"
          className={`mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm ${saveKind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          {saveKind === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : null}
          {saveMessage}
        </div>
      ) : null}

      <div key={user.id} className="grid gap-4 md:grid-cols-2 md:gap-6">
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-[#fcfaf7]">
            <h2 className="text-base font-semibold">Profile photo</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col items-center gap-5 py-2 text-center sm:flex-row sm:text-left">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
                <Image src={displayAvatar} alt="Your profile photo" fill sizes="96px" className="object-cover" />
                {avatarUploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <LoaderCircle className="h-7 w-7 animate-spin text-white" />
                  </div>
                ) : null}
              </div>

              <div className="min-w-0">
                <p className="text-sm leading-6 text-neutral-500">This photo appears next to your community reviews and comments.</p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                  {avatarUploading ? "Uploading…" : "Change photo"}
                </button>
                <p className="mt-2 text-xs text-neutral-400">JPG, PNG or WebP · max 4 MB</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-[#fcfaf7]">
            <h2 className="text-base font-semibold">Profile details</h2>
          </CardHeader>
          <CardBody className="space-y-5">
            <div>
              <label htmlFor="profile-name" className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Name</label>
              <Input id="profile-name" value={displayName} onChange={(event) => setEditingName(event.target.value)} className="mt-2 min-h-11" />
              <Button className="mt-3 min-h-10" size="sm" onClick={saveName} disabled={savingName}>
                {savingName ? "Saving…" : "Save name"}
              </Button>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Email</p>
              <p className="mt-1 break-all text-sm">{user.email}</p>
            </div>
          </CardBody>
        </Card>

        <div className="md:col-span-2">
          <Card className="overflow-hidden rounded-2xl">
            <CardHeader className="bg-[#fcfaf7]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500">Email updates</p>
                  <h2 className="mt-1 text-base font-semibold">Pages & Peace marketing emails</h2>
                </div>
                <span
                  title={subscribedToMarketing ? "Subscribed" : "Not subscribed"}
                  aria-label={subscribedToMarketing ? "Subscribed" : "Not subscribed"}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${subscribedToMarketing ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}
                >
                  {subscribedToMarketing ? <MailCheck className="h-4 w-4" /> : <MailX className="h-4 w-4" />}
                </span>
              </div>
            </CardHeader>
            <CardBody>
              {subscribedToMarketing ? (
                <p className="text-sm leading-6 text-neutral-600">
                  You are signed up to receive Pages & Peace event, book and café updates. To unsubscribe, use the unsubscribe link in any marketing email.
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-neutral-600">
                    You are not currently signed up to receive Pages & Peace marketing emails. You can opt in for event news, book recommendations and café updates.
                  </p>
                  <Button onClick={subscribeToMarketing} disabled={marketingBusy}>
                    {marketingBusy ? "Signing you up…" : "Sign me up"}
                  </Button>
                </div>
              )}

              {marketingMessage ? (
                <p className={`mt-3 text-sm ${marketingMessage.includes("✓") ? "text-emerald-700" : "text-amber-700"}`} role="status">
                  {marketingMessage}
                </p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
