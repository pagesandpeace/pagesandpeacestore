"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { StoreSettings } from "@/types/store";

export default function StoreSettingsPage() {
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const storeId = "941ead81-20f8-45aa-aaf4-b06cacde724c";

  useEffect(() => {
    fetch(`/api/stores/${storeId}`)
      .then((res) => res.json())
      .then((data) => {
        setStore(data.store);
        setLoading(false);
      });
  }, []);

  if (loading || !store) {
    return <main className="p-6">Loading…</main>;
  }

  const handleInput =
    (field: keyof StoreSettings) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setStore({ ...store, [field]: e.target.value });
    };

  const handleOpeningHour =
    (day: string) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setStore({
        ...store,
        opening_hours: {
          ...store.opening_hours,
          [day]: e.target.value,
        },
      });
    };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    await fetch(`/api/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(store),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-10">
      <h1 className="text-3xl font-semibold">Store Settings</h1>

      {saved && <Alert type="success" message="Saved successfully!" />}

      {/* CONTACT */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Contact Details</h2>

        <Input
          placeholder="Phone"
          value={store.phone ?? ""}
          onChange={handleInput("phone")}
        />

        <Input
          placeholder="Email"
          value={store.email ?? ""}
          onChange={handleInput("email")}
        />

        <TextArea
          placeholder="Address"
          value={store.address}
          onChange={handleInput("address")}
        />
      </section>

      {/* OPENING HOURS */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Opening Hours</h2>

        {Object.entries(store.opening_hours).map(([day, val]) => (
          <Input
            key={day}
            placeholder={day.charAt(0).toUpperCase() + day.slice(1)}
            value={val ?? ""}
            onChange={handleOpeningHour(day)}
          />
        ))}
      </section>

      {/* COLLECTION INSTRUCTIONS */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Collection Instructions</h2>
        <TextArea
          placeholder="Collection instructions…"
          value={store.collection_instructions ?? ""}
          onChange={handleInput("collection_instructions")}
        />
      </section>

      <Button disabled={saving} onClick={handleSave}>
        {saving ? "Saving…" : "Save Settings"}
      </Button>
    </main>
  );
}
