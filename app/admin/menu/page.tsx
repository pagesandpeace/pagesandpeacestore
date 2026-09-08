"use client";

import { useEffect, useMemo, useState } from "react";

type Category = { id: string; name: string; position: number };
type Item = { id: string; category_id: string; name: string; price: number; position: number; note: string | null; is_visible: boolean };

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newItem, setNewItem] = useState({ category_id: "", name: "", price: "", note: "" });
  const [creating, setCreating] = useState<"category" | "item" | null>(null);

  async function load() {
    const res = await fetch("/api/app-core/admin/menu", { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      setCategories(data.categories ?? []);
      setItems(data.items ?? []);
      setNewItem((current) => ({ ...current, category_id: current.category_id || data.categories?.[0]?.id || "" }));
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

  async function addCategory() {
    if (!newCategory.trim()) return;
    setCreating("category");
    setMessage("");
    const res = await fetch("/api/app-core/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "category", name: newCategory }),
    });
    const data = await res.json().catch(() => null);
    setCreating(null);
    if (!res.ok) {
      setMessage(data?.error || "Could not add category");
      return;
    }
    setNewCategory("");
    setMessage("Category added");
    await load();
  }

  async function addItem() {
    const price = Number(newItem.price);
    if (!newItem.category_id || !newItem.name.trim() || !Number.isFinite(price) || price < 0) return;
    setCreating("item");
    setMessage("");
    const res = await fetch("/api/app-core/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "item",
        category_id: newItem.category_id,
        name: newItem.name,
        price,
        note: newItem.note,
      }),
    });
    const data = await res.json().catch(() => null);
    setCreating(null);
    if (!res.ok) {
      setMessage(data?.error || "Could not add menu item");
      return;
    }
    setNewItem((current) => ({ ...current, name: "", price: "", note: "" }));
    setMessage("Menu item added");
    await load();
  }

  return (
    <main className="space-y-6">
      <div>
        <p className="text-sm font-medium text-foreground/60">Website content</p>
        <h1 className="mt-1 text-3xl font-bold">Menu</h1>
        <p className="mt-2 text-foreground/65">Add categories and items, edit prices and descriptions, and control what is visible on the public menu.</p>
      </div>

      {message ? <div className="rounded-xl border bg-white px-4 py-3 text-sm">{message}</div> : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-semibold">Add category</h2>
          <div className="mt-4 flex gap-2">
            <input className="flex-1 rounded-lg border px-3 py-2" placeholder="Category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <button onClick={addCategory} disabled={creating === "category" || !newCategory.trim()} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{creating === "category" ? "Adding…" : "Add"}</button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-semibold">Add menu item</h2>
          <div className="mt-4 grid gap-3">
            <select className="rounded-lg border px-3 py-2" value={newItem.category_id} onChange={(e) => setNewItem((current) => ({ ...current, category_id: e.target.value }))}>
              <option value="">Choose category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <input className="rounded-lg border px-3 py-2" placeholder="Item name" value={newItem.name} onChange={(e) => setNewItem((current) => ({ ...current, name: e.target.value }))} />
            <div className="flex items-center gap-1"><span>£</span><input className="w-full rounded-lg border px-3 py-2" type="number" min="0" step="0.01" placeholder="0.00" value={newItem.price} onChange={(e) => setNewItem((current) => ({ ...current, price: e.target.value }))} /></div>
            <input className="rounded-lg border px-3 py-2" placeholder="Note / description (optional)" value={newItem.note} onChange={(e) => setNewItem((current) => ({ ...current, note: e.target.value }))} />
            <button onClick={addItem} disabled={creating === "item" || !newItem.category_id || !newItem.name.trim() || newItem.price === ""} className="w-fit rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{creating === "item" ? "Adding…" : "Add item"}</button>
          </div>
        </div>
      </section>

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
