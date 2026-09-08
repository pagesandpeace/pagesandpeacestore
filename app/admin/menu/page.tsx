"use client";

import { useEffect, useMemo, useState } from "react";

type Category = { id: string; name: string; position: number };
type Item = { id: string; category_id: string; name: string; price: number; position: number; note: string | null; is_visible: boolean };

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/app-core/admin/menu", { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      setCategories(data.categories ?? []);
      setItems(data.items ?? []);
    }
  }

  useEffect(() => { void load(); }, []);

  const grouped = useMemo(() => categories.map((category) => ({
    ...category,
    items: items.filter((item) => item.category_id === category.id),
  })), [categories, items]);

  function updateItem(id: string, patch: Partial<Item>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function save(item: Item) {
    setSavingId(item.id);
    setMessage("");
    const res = await fetch("/api/app-core/admin/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const data = await res.json().catch(() => null);
    setSavingId(null);
    if (!res.ok) {
      setMessage(data?.error || "Could not save menu item");
      return;
    }
    setMessage(`${item.name} saved`);
  }

  return (
    <main className="space-y-6">
      <div>
        <p className="text-sm font-medium text-foreground/60">Website content</p>
        <h1 className="mt-1 text-3xl font-bold">Menu</h1>
        <p className="mt-2 text-foreground/65">Edit prices, descriptions and visibility. Changes feed the public menu directly.</p>
      </div>

      {message ? <div className="rounded-xl border bg-white px-4 py-3 text-sm">{message}</div> : null}

      <div className="space-y-6">
        {grouped.map((category) => (
          <section key={category.id} className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold">{category.name}</h2>
            <div className="mt-4 space-y-3">
              {category.items.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1.6fr_0.7fr_1.8fr_0.7fr_auto] md:items-center">
                  <input className="rounded-lg border px-3 py-2" value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} />
                  <div className="flex items-center gap-1"><span>£</span><input className="w-full rounded-lg border px-3 py-2" type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })} /></div>
                  <input className="rounded-lg border px-3 py-2" placeholder="Note / description" value={item.note ?? ""} onChange={(e) => updateItem(item.id, { note: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.is_visible} onChange={(e) => updateItem(item.id, { is_visible: e.target.checked })} /> Visible</label>
                  <button onClick={() => save(item)} disabled={savingId === item.id} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingId === item.id ? "Saving…" : "Save"}</button>
                </div>
              ))}
              {!category.items.length ? <p className="text-sm text-foreground/60">No items in this category.</p> : null}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
