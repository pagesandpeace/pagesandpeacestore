"use client";

import { useEffect, useMemo, useState } from "react";

type Section = { id: string; name: string; slug: string; position: number; display_mode: "menu_tab" | "standalone"; is_visible: boolean };
type Category = { id: string; name: string; position: number; section_id: string | null };
type Item = { id: string; category_id: string; name: string; price: number; position: number; note: string | null; is_visible: boolean };
type Draft = { kind: "section" | "category" | "item"; id: string; data: Record<string, string | number | boolean | null> } | null;

export default function AdminMenuPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState<Draft>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [newSection, setNewSection] = useState({ name: "", display_mode: "menu_tab" as "menu_tab" | "standalone" });
  const [newCategory, setNewCategory] = useState({ section_id: "", name: "" });
  const [newItem, setNewItem] = useState({ category_id: "", name: "", price: "", note: "" });

  async function load() {
    const res = await fetch("/api/app-core/admin/menu", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return setMessage(data?.error || "Could not load menu editor");
    setSections(data.sections ?? []);
    setCategories(data.categories ?? []);
    setItems(data.items ?? []);
    setNewCategory((v) => ({ ...v, section_id: v.section_id || data.sections?.[0]?.id || "" }));
    setNewItem((v) => ({ ...v, category_id: v.category_id || data.categories?.[0]?.id || "" }));
  }

  useEffect(() => { void load(); }, []);

  const tree = useMemo(() => sections.map((section) => ({
    ...section,
    categories: categories.filter((category) => category.section_id === section.id).map((category) => ({
      ...category,
      items: items.filter((item) => item.category_id === category.id),
    })),
  })), [sections, categories, items]);

  async function post(body: Record<string, unknown>, success: string) {
    setBusy(true); setMessage("");
    const res = await fetch("/api/app-core/admin/menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) { setMessage(data?.error || "Could not save"); return false; }
    setMessage(success); await load(); return true;
  }

  async function patch() {
    if (!draft) return;
    setBusy(true); setMessage("");
    const res = await fetch("/api/app-core/admin/menu", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: draft.kind, id: draft.id, ...draft.data }) });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) return setMessage(data?.error || "Could not save changes");
    setDraft(null); setMessage("Changes saved"); await load();
  }

  const editing = (kind: "section" | "category" | "item", id: string) => draft?.kind === kind && draft.id === id;
  const changeDraft = (key: string, value: string | number | boolean | null) => setDraft((current) => current ? { ...current, data: { ...current.data, [key]: value } } : current);

  return <main className="space-y-8">
    <header>
      <p className="text-sm font-medium text-foreground/60">Website content</p>
      <h1 className="mt-1 text-3xl font-bold">Menu structure</h1>
      <p className="mt-2 max-w-3xl text-foreground/65">Build the menu in three levels: create a menu section, add categories inside it, then add items. Existing content is locked until you click Edit, and nothing changes publicly until you press Save.</p>
    </header>

    {message ? <div className="rounded-xl border bg-white px-4 py-3 text-sm">{message}</div> : null}

    <section className="grid gap-4 xl:grid-cols-3">
      <div className="rounded-2xl border bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Step 1</p><h2 className="text-lg font-semibold">Add menu section</h2><p className="mt-1 text-sm text-foreground/60">Examples: Drinks, Food, Snacks, Merchandise.</p>
        <input className="mt-4 w-full rounded-lg border px-3 py-2" placeholder="Section name" value={newSection.name} onChange={(e) => setNewSection({ ...newSection, name: e.target.value })} />
        <select className="mt-3 w-full rounded-lg border px-3 py-2" value={newSection.display_mode} onChange={(e) => setNewSection({ ...newSection, display_mode: e.target.value as "menu_tab" | "standalone" })}><option value="menu_tab">Show as a tab on /menu</option><option value="standalone">Standalone section/page</option></select>
        <button className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !newSection.name.trim()} onClick={async () => { if (await post({ type: "section", ...newSection }, "Menu section added")) setNewSection({ name: "", display_mode: "menu_tab" }); }}>Add section</button>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Step 2</p><h2 className="text-lg font-semibold">Add category</h2><p className="mt-1 text-sm text-foreground/60">Choose the menu section first.</p>
        <select className="mt-4 w-full rounded-lg border px-3 py-2" value={newCategory.section_id} onChange={(e) => setNewCategory({ ...newCategory, section_id: e.target.value })}><option value="">Choose menu section</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input className="mt-3 w-full rounded-lg border px-3 py-2" placeholder="Category name" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
        <button className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !newCategory.section_id || !newCategory.name.trim()} onClick={async () => { if (await post({ type: "category", ...newCategory }, "Category added")) setNewCategory((v) => ({ ...v, name: "" })); }}>Add category</button>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Step 3</p><h2 className="text-lg font-semibold">Add item</h2><p className="mt-1 text-sm text-foreground/60">Choose a category, then enter the item.</p>
        <select className="mt-4 w-full rounded-lg border px-3 py-2" value={newItem.category_id} onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}><option value="">Choose category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input className="mt-3 w-full rounded-lg border px-3 py-2" placeholder="Item name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
        <input className="mt-3 w-full rounded-lg border px-3 py-2" type="number" min="0" step="0.01" placeholder="Price" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
        <input className="mt-3 w-full rounded-lg border px-3 py-2" placeholder="Note / description (optional)" value={newItem.note} onChange={(e) => setNewItem({ ...newItem, note: e.target.value })} />
        <button className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !newItem.category_id || !newItem.name.trim() || newItem.price === ""} onClick={async () => { if (await post({ type: "item", category_id: newItem.category_id, name: newItem.name, price: Number(newItem.price), note: newItem.note }, "Menu item added")) setNewItem((v) => ({ ...v, name: "", price: "", note: "" })); }}>Add item</button>
      </div>
    </section>

    <section className="space-y-6">
      <div><h2 className="text-2xl font-semibold">Current menu</h2><p className="text-sm text-foreground/60">Edit mode, Save and Cancel protect against accidental changes.</p></div>
      {tree.map((section) => <article key={section.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          {editing("section", section.id) ? <div className="grid flex-1 gap-2 md:grid-cols-3"><input className="rounded-lg border px-3 py-2" value={String(draft?.data.name ?? "")} onChange={(e) => changeDraft("name", e.target.value)} /><select className="rounded-lg border px-3 py-2" value={String(draft?.data.display_mode ?? "menu_tab")} onChange={(e) => changeDraft("display_mode", e.target.value)}><option value="menu_tab">Menu tab</option><option value="standalone">Standalone</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft?.data.is_visible)} onChange={(e) => changeDraft("is_visible", e.target.checked)} /> Visible</label></div> : <div><h3 className="text-xl font-semibold">{section.name}</h3><p className="text-sm text-foreground/55">{section.display_mode === "menu_tab" ? "Menu tab" : "Standalone page"}{section.is_visible ? " · Visible" : " · Hidden"}</p></div>}
          <div className="flex gap-2">{editing("section", section.id) ? <><button className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white" onClick={patch} disabled={busy}>Save changes</button><button className="rounded-full border px-4 py-2 text-sm" onClick={() => setDraft(null)} disabled={busy}>Cancel</button></> : <button className="rounded-full border px-4 py-2 text-sm font-semibold" onClick={() => setDraft({ kind: "section", id: section.id, data: { name: section.name, slug: section.slug, display_mode: section.display_mode, is_visible: section.is_visible } })}>Edit section</button>}</div>
        </div>

        <div className="mt-5 space-y-5">{section.categories.map((category) => <div key={category.id} className="rounded-xl bg-[#FAF6F1] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">{editing("category", category.id) ? <div className="grid flex-1 gap-2 md:grid-cols-2"><input className="rounded-lg border px-3 py-2" value={String(draft?.data.name ?? "")} onChange={(e) => changeDraft("name", e.target.value)} /><select className="rounded-lg border px-3 py-2" value={String(draft?.data.section_id ?? "")} onChange={(e) => changeDraft("section_id", e.target.value)}>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div> : <h4 className="font-semibold">{category.name}</h4>}<div className="flex gap-2">{editing("category", category.id) ? <><button className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-white" onClick={patch} disabled={busy}>Save</button><button className="rounded-full border px-3 py-1.5 text-sm" onClick={() => setDraft(null)}>Cancel</button></> : <button className="rounded-full border px-3 py-1.5 text-sm" onClick={() => setDraft({ kind: "category", id: category.id, data: { name: category.name, section_id: category.section_id ?? section.id } })}>Edit category</button>}</div></div>
          <div className="mt-3 space-y-2">{category.items.map((item) => <div key={item.id} className="rounded-lg border bg-white p-3">{editing("item", item.id) ? <div className="grid gap-2 md:grid-cols-[1.3fr_.6fr_1.4fr_.6fr_auto]"><input className="rounded-lg border px-3 py-2" value={String(draft?.data.name ?? "")} onChange={(e) => changeDraft("name", e.target.value)} /><input className="rounded-lg border px-3 py-2" type="number" step="0.01" min="0" value={Number(draft?.data.price ?? 0)} onChange={(e) => changeDraft("price", Number(e.target.value))} /><input className="rounded-lg border px-3 py-2" value={String(draft?.data.note ?? "")} onChange={(e) => changeDraft("note", e.target.value)} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft?.data.is_visible)} onChange={(e) => changeDraft("is_visible", e.target.checked)} /> Visible</label><div className="flex gap-2"><button className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-white" onClick={patch} disabled={busy}>Save</button><button className="rounded-full border px-3 py-1.5 text-sm" onClick={() => setDraft(null)}>Cancel</button></div></div> : <div className="flex items-center justify-between gap-4"><div><p className="font-medium">{item.name} <span className="font-normal text-foreground/55">£{Number(item.price).toFixed(2)}</span></p>{item.note ? <p className="text-sm text-foreground/55">{item.note}</p> : null}<p className="mt-1 text-xs text-foreground/45">{item.is_visible ? "Visible" : "Hidden"}</p></div><button className="rounded-full border px-3 py-1.5 text-sm" onClick={() => setDraft({ kind: "item", id: item.id, data: { name: item.name, price: item.price, note: item.note ?? "", is_visible: item.is_visible, position: item.position } })}>Edit</button></div>}</div>)}{!category.items.length ? <p className="text-sm text-foreground/50">No items yet.</p> : null}</div>
        </div>)}{!section.categories.length ? <p className="text-sm text-foreground/50">No categories in this section yet.</p> : null}</div>
      </article>)}
    </section>
  </main>;
}
