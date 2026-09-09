"use client";

import { useEffect, useMemo, useState } from "react";

type Section = { id: string; name: string; slug: string; position: number; is_visible: boolean };
type Category = { id: string; name: string; position: number; section_id: string | null };
type Item = { id: string; category_id: string; name: string; price: number; position: number; note: string | null; is_visible: boolean };
type Kind = "section" | "category" | "item";
type Draft = { kind: Kind; id: string; name: string; is_visible?: boolean; section_id?: string; price?: string; note?: string } | null;

export default function AdminMenuPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newItem, setNewItem] = useState({ name: "", price: "", note: "" });
  const [draft, setDraft] = useState<Draft>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(preferredSection?: string, preferredCategory?: string) {
    const res = await fetch("/api/app-core/admin/menu", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return setMessage(data?.error || "Could not load menu");
    const nextSections: Section[] = data.sections ?? [];
    const nextCategories: Category[] = data.categories ?? [];
    const nextItems: Item[] = data.items ?? [];
    setSections(nextSections);
    setCategories(nextCategories);
    setItems(nextItems);
    const sid = preferredSection && nextSections.some((s) => s.id === preferredSection)
      ? preferredSection
      : selectedSectionId && nextSections.some((s) => s.id === selectedSectionId)
        ? selectedSectionId
        : nextSections[0]?.id ?? "";
    setSelectedSectionId(sid);
    const cats = nextCategories.filter((c) => c.section_id === sid);
    const cid = preferredCategory && cats.some((c) => c.id === preferredCategory)
      ? preferredCategory
      : selectedCategoryId && cats.some((c) => c.id === selectedCategoryId)
        ? selectedCategoryId
        : cats[0]?.id ?? "";
    setSelectedCategoryId(cid);
  }

  useEffect(() => { void load(); }, []);

  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null;
  const sectionCategories = useMemo(() => categories.filter((c) => c.section_id === selectedSectionId), [categories, selectedSectionId]);
  const selectedCategory = sectionCategories.find((c) => c.id === selectedCategoryId) ?? null;
  const categoryItems = useMemo(() => items.filter((i) => i.category_id === selectedCategoryId), [items, selectedCategoryId]);

  async function request(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>, success: string, preferredSection?: string, preferredCategory?: string) {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/app-core/admin/menu", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Could not save menu");
      return null;
    }
    setMessage(success);
    setDraft(null);
    await load(preferredSection, preferredCategory);
    return data;
  }

  async function reorder(level: Kind, rows: { id: string }[], index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const reordered = [...rows];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await request("PATCH", { type: "reorder", level, orderedIds: reordered.map((r) => r.id) }, "Order updated", selectedSectionId, selectedCategoryId);
  }

  async function deleteThing(kind: Kind, id: string, name: string) {
    const childText = kind === "section"
      ? " This will also permanently delete every category and item inside this tab."
      : kind === "category"
        ? " This will also permanently delete every item inside this category."
        : "";
    if (!window.confirm(`Delete ${name}?${childText}\n\nThis cannot be undone.`)) return;
    const preferredSection = kind === "section" ? undefined : selectedSectionId;
    const preferredCategory = kind === "category" || kind === "section" ? undefined : selectedCategoryId;
    await request("DELETE", { type: kind, id }, `${name} deleted`, preferredSection, preferredCategory);
  }

  async function saveDraft() {
    if (!draft || !draft.name.trim()) return;
    if (draft.kind === "section") {
      await request("PATCH", { type: "section", id: draft.id, name: draft.name, is_visible: Boolean(draft.is_visible) }, "Tab updated", selectedSectionId, selectedCategoryId);
    } else if (draft.kind === "category") {
      await request("PATCH", { type: "category", id: draft.id, name: draft.name, section_id: draft.section_id }, "Category updated", draft.section_id, draft.id);
    } else {
      await request("PATCH", { type: "item", id: draft.id, name: draft.name, price: Number(draft.price), note: draft.note, is_visible: Boolean(draft.is_visible) }, "Item updated", selectedSectionId, selectedCategoryId);
    }
  }

  const input = "rounded-lg border px-3 py-2";
  const smallButton = "rounded-lg border px-3 py-2 text-sm";
  const dangerButton = "rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700";

  return <main className="space-y-8">
    <header>
      <p className="text-sm font-medium text-foreground/60">Website content</p>
      <h1 className="mt-1 text-3xl font-bold">Café menu</h1>
      <p className="mt-2 max-w-3xl text-foreground/65">Manage tabs, categories and items in place. Use the arrows to control the exact order customers see.</p>
    </header>
    {message ? <div className="rounded-xl border bg-white px-4 py-3 text-sm">{message}</div> : null}

    <section className="rounded-2xl border bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Step 1</p><h2 className="text-xl font-semibold">Menu tabs</h2></div>
        <div className="flex gap-2"><input className={input} placeholder="New tab" value={newSection} onChange={(e) => setNewSection(e.target.value)} /><button disabled={busy || !newSection.trim()} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={async () => { const data = await request("POST", { type: "section", name: newSection }, "Tab added"); if (data?.section?.id) { setNewSection(""); setSelectedSectionId(data.section.id); setSelectedCategoryId(""); } }}>Add tab</button></div>
      </div>
      <div className="mt-5 space-y-2">
        {sections.map((section, index) => {
          const editing = draft?.kind === "section" && draft.id === section.id;
          return <div key={section.id} className={`rounded-xl border p-2 ${section.id === selectedSectionId ? "border-[#189458] bg-[#189458]/5" : ""}`}>
            {editing ? <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
              <input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><input type="checkbox" checked={Boolean(draft.is_visible)} onChange={(e) => setDraft({ ...draft, is_visible: e.target.checked })} />Visible</label>
              <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white" disabled={busy} onClick={() => void saveDraft()}>Save</button>
              <button className={smallButton} disabled={busy} onClick={() => setDraft(null)}>Cancel</button>
            </div> : <div className="flex items-center gap-2">
              <button className="min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left font-semibold" onClick={() => { setSelectedSectionId(section.id); setSelectedCategoryId(categories.find((c) => c.section_id === section.id)?.id ?? ""); }}>{section.name}<span className="ml-2 text-xs font-normal text-foreground/45">{section.is_visible ? "public" : "hidden"}</span></button>
              <button title="Move tab up" disabled={busy || index === 0} className={`${smallButton} disabled:opacity-30`} onClick={() => void reorder("section", sections, index, -1)}>↑</button>
              <button title="Move tab down" disabled={busy || index === sections.length - 1} className={`${smallButton} disabled:opacity-30`} onClick={() => void reorder("section", sections, index, 1)}>↓</button>
              <button className={smallButton} onClick={() => setDraft({ kind: "section", id: section.id, name: section.name, is_visible: section.is_visible })}>Edit</button>
              <button className={dangerButton} onClick={() => void deleteThing("section", section.id, section.name)}>Delete</button>
            </div>}
          </div>;
        })}
      </div>
    </section>

    {selectedSection ? <section className="rounded-2xl border bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Step 2</p><h2 className="text-xl font-semibold">Categories in {selectedSection.name}</h2></div>
        <div className="flex gap-2"><input className={input} placeholder="New category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} /><button disabled={busy || !newCategory.trim()} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={async () => { const data = await request("POST", { type: "category", section_id: selectedSection.id, name: newCategory }, "Category added", selectedSection.id); if (data?.category?.id) { setNewCategory(""); setSelectedCategoryId(data.category.id); } }}>Add category</button></div>
      </div>
      <div className="mt-5 space-y-2">
        {sectionCategories.map((category, index) => {
          const editing = draft?.kind === "category" && draft.id === category.id;
          return <div key={category.id} className={`rounded-xl border p-2 ${category.id === selectedCategoryId ? "border-[#189458] bg-[#189458]/5" : ""}`}>
            {editing ? <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
              <input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <select className={input} value={draft.section_id} onChange={(e) => setDraft({ ...draft, section_id: e.target.value })}>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white" disabled={busy} onClick={() => void saveDraft()}>Save</button>
              <button className={smallButton} disabled={busy} onClick={() => setDraft(null)}>Cancel</button>
            </div> : <div className="flex items-center gap-2">
              <button className="min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left font-semibold" onClick={() => setSelectedCategoryId(category.id)}>{category.name}<span className="ml-2 text-xs font-normal text-foreground/45">{items.filter((i) => i.category_id === category.id).length} items</span></button>
              <button title="Move category up" disabled={busy || index === 0} className={`${smallButton} disabled:opacity-30`} onClick={() => void reorder("category", sectionCategories, index, -1)}>↑</button>
              <button title="Move category down" disabled={busy || index === sectionCategories.length - 1} className={`${smallButton} disabled:opacity-30`} onClick={() => void reorder("category", sectionCategories, index, 1)}>↓</button>
              <button className={smallButton} onClick={() => setDraft({ kind: "category", id: category.id, name: category.name, section_id: category.section_id ?? selectedSection.id })}>Edit</button>
              <button className={dangerButton} onClick={() => void deleteThing("category", category.id, category.name)}>Delete</button>
            </div>}
          </div>;
        })}
        {!sectionCategories.length ? <p className="rounded-xl border border-dashed p-5 text-sm text-foreground/50">No categories yet.</p> : null}
      </div>
    </section> : null}

    {selectedSection && selectedCategory ? <section className="rounded-2xl border bg-white p-5 sm:p-6">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Step 3</p><h2 className="text-xl font-semibold">Items in {selectedCategory.name}</h2><p className="mt-1 text-sm text-foreground/55">Order these exactly as you want them to appear on the public menu.</p></div>
      <div className="mt-5 grid gap-2 md:grid-cols-[1fr_.35fr_1fr_auto]"><input className={input} placeholder="Item name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} /><input className={input} type="number" min="0" step="0.01" placeholder="Price" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} /><input className={input} placeholder="Description / note" value={newItem.note} onChange={(e) => setNewItem({ ...newItem, note: e.target.value })} /><button disabled={busy || !newItem.name.trim() || newItem.price === ""} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={async () => { const data = await request("POST", { type: "item", category_id: selectedCategory.id, name: newItem.name, price: Number(newItem.price), note: newItem.note }, "Item added", selectedSection.id, selectedCategory.id); if (data) setNewItem({ name: "", price: "", note: "" }); }}>Add item</button></div>
      <div className="mt-6 space-y-2">
        {categoryItems.map((item, index) => {
          const editing = draft?.kind === "item" && draft.id === item.id;
          return <div key={item.id} className="rounded-xl border p-3">
            {editing ? <div className="grid gap-2 md:grid-cols-[1.1fr_.4fr_1fr_auto_auto]">
              <input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <input className={input} type="number" min="0" step="0.01" value={draft.price ?? ""} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
              <input className={input} value={draft.note ?? ""} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Description / note" />
              <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><input type="checkbox" checked={Boolean(draft.is_visible)} onChange={(e) => setDraft({ ...draft, is_visible: e.target.checked })} />Visible</label>
              <div className="flex gap-2"><button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white" disabled={busy} onClick={() => void saveDraft()}>Save</button><button className={smallButton} disabled={busy} onClick={() => setDraft(null)}>Cancel</button></div>
            </div> : <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{item.name} <span className="font-normal text-foreground/50">£{Number(item.price).toFixed(2)}</span></p>{item.note ? <p className="truncate text-sm text-foreground/50">{item.note}</p> : null}<p className="text-xs text-foreground/40">{item.is_visible ? "Visible" : "Hidden"}</p></div>
              <button title="Move item up" disabled={busy || index === 0} className={`${smallButton} disabled:opacity-30`} onClick={() => void reorder("item", categoryItems, index, -1)}>↑</button>
              <button title="Move item down" disabled={busy || index === categoryItems.length - 1} className={`${smallButton} disabled:opacity-30`} onClick={() => void reorder("item", categoryItems, index, 1)}>↓</button>
              <button className={smallButton} onClick={() => setDraft({ kind: "item", id: item.id, name: item.name, price: String(item.price), note: item.note ?? "", is_visible: item.is_visible })}>Edit</button>
              <button className={dangerButton} onClick={() => void deleteThing("item", item.id, item.name)}>Delete</button>
            </div>}
          </div>;
        })}
        {!categoryItems.length ? <p className="rounded-xl border border-dashed p-5 text-sm text-foreground/50">No items in this category yet.</p> : null}
      </div>
    </section> : null}
  </main>;
}
