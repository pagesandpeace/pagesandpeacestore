"use client";

import { useEffect, useMemo, useState } from "react";

type Section = { id: string; name: string; slug: string; position: number; is_visible: boolean };
type Category = { id: string; name: string; position: number; section_id: string | null };
type Item = { id: string; category_id: string; name: string; price: number; position: number; note: string | null; is_visible: boolean };
type Draft = { kind: "section" | "category" | "item"; id: string; data: Record<string, string | number | boolean | null> } | null;

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function AdminMenuPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [draft, setDraft] = useState<Draft>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItem, setNewItem] = useState({ name: "", price: "", note: "" });

  async function load(preferredSectionId?: string, preferredCategoryId?: string) {
    const res = await fetch("/api/app-core/admin/menu", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return setMessage(data?.error || "Could not load menu editor");
    const nextSections: Section[] = data.sections ?? [];
    const nextCategories: Category[] = data.categories ?? [];
    const nextItems: Item[] = data.items ?? [];
    setSections(nextSections);
    setCategories(nextCategories);
    setItems(nextItems);

    const sectionId = preferredSectionId && nextSections.some((s) => s.id === preferredSectionId)
      ? preferredSectionId
      : selectedSectionId && nextSections.some((s) => s.id === selectedSectionId)
        ? selectedSectionId
        : nextSections[0]?.id ?? "";
    setSelectedSectionId(sectionId);

    const sectionCategories = nextCategories.filter((c) => c.section_id === sectionId);
    const categoryId = preferredCategoryId && sectionCategories.some((c) => c.id === preferredCategoryId)
      ? preferredCategoryId
      : selectedCategoryId && sectionCategories.some((c) => c.id === selectedCategoryId)
        ? selectedCategoryId
        : sectionCategories[0]?.id ?? "";
    setSelectedCategoryId(categoryId);
  }

  useEffect(() => { void load(); }, []);

  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null;
  const sectionCategories = useMemo(
    () => categories.filter((category) => category.section_id === selectedSectionId),
    [categories, selectedSectionId],
  );
  const selectedCategory = sectionCategories.find((c) => c.id === selectedCategoryId) ?? null;
  const categoryItems = useMemo(
    () => items.filter((item) => item.category_id === selectedCategoryId),
    [items, selectedCategoryId],
  );
  const visibleItemsInSection = useMemo(() => {
    const categoryIds = new Set(sectionCategories.map((c) => c.id));
    return items.filter((item) => categoryIds.has(item.category_id) && item.is_visible).length;
  }, [items, sectionCategories]);

  function chooseSection(id: string) {
    setSelectedSectionId(id);
    const firstCategory = categories.find((c) => c.section_id === id)?.id ?? "";
    setSelectedCategoryId(firstCategory);
    setDraft(null);
    setMessage("");
  }

  function chooseCategory(id: string) {
    setSelectedCategoryId(id);
    setDraft(null);
    setMessage("");
  }

  async function post(body: Record<string, unknown>, success: string, preferredSectionId?: string, preferredCategoryId?: string) {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/app-core/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage(data?.error || "Could not save");
      return null;
    }
    setMessage(success);
    await load(preferredSectionId ?? data?.section?.id, preferredCategoryId ?? data?.category?.id);
    return data;
  }

  async function patch() {
    if (!draft) return;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/app-core/admin/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: draft.kind, id: draft.id, ...draft.data }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) return setMessage(data?.error || "Could not save changes");
    setDraft(null);
    setMessage("Changes saved");
    await load(selectedSectionId, selectedCategoryId);
  }

  async function addSection() {
    const name = newSectionName.trim();
    if (!name) return;
    const slug = slugify(name);
    const existing = sections.find((s) => s.slug === slug);
    if (existing) {
      chooseSection(existing.id);
      setNewSectionName("");
      setMessage(`${existing.name} already exists, so I selected it for you.`);
      return;
    }
    const data = await post({ type: "section", name }, "Menu tab added");
    if (data?.section?.id) {
      setNewSectionName("");
      setSelectedSectionId(data.section.id);
      setSelectedCategoryId("");
    }
  }

  async function addCategory() {
    if (!selectedSection || !newCategoryName.trim()) return;
    const data = await post(
      { type: "category", section_id: selectedSection.id, name: newCategoryName.trim() },
      `Category added to ${selectedSection.name}`,
      selectedSection.id,
    );
    if (data?.category?.id) {
      setNewCategoryName("");
      setSelectedCategoryId(data.category.id);
    }
  }

  async function addItem() {
    if (!selectedSection || !selectedCategory || !newItem.name.trim() || newItem.price === "") return;
    const data = await post(
      { type: "item", category_id: selectedCategory.id, name: newItem.name.trim(), price: Number(newItem.price), note: newItem.note },
      `Item added to ${selectedCategory.name}`,
      selectedSection.id,
      selectedCategory.id,
    );
    if (data) setNewItem({ name: "", price: "", note: "" });
  }

  const editing = (kind: "section" | "category" | "item", id: string) => draft?.kind === kind && draft.id === id;
  const changeDraft = (key: string, value: string | number | boolean | null) => setDraft((current) => current ? { ...current, data: { ...current.data, [key]: value } } : current);

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm font-medium text-foreground/60">Website content</p>
        <h1 className="mt-1 text-3xl font-bold">Café menu</h1>
        <p className="mt-2 max-w-3xl text-foreground/65">
          Build the menu in order: create a menu tab, select it and add categories, then select a category and add its items.
        </p>
      </header>

      {message ? <div className="rounded-xl border bg-white px-4 py-3 text-sm">{message}</div> : null}

      <section className="rounded-2xl border bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Step 1</p>
            <h2 className="text-xl font-semibold">Menu tabs</h2>
            <p className="mt-1 text-sm text-foreground/60">These are the tabs customers see on the public menu, such as Drinks, Food and Snacks.</p>
          </div>
          <div className="flex w-full max-w-md gap-2 sm:w-auto">
            <input className="min-w-0 flex-1 rounded-lg border px-3 py-2" placeholder="New tab name" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addSection(); } }} />
            <button className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !newSectionName.trim()} onClick={() => void addSection()}>Add tab</button>
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {sections.map((section) => {
            const categoryIds = new Set(categories.filter((c) => c.section_id === section.id).map((c) => c.id));
            const visibleCount = items.filter((item) => categoryIds.has(item.category_id) && item.is_visible).length;
            return <button key={section.id} onClick={() => chooseSection(section.id)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${selectedSectionId === section.id ? "border-[#189458] bg-[#189458] text-white" : "bg-white text-foreground hover:border-[#189458]"}`}>
              {section.name} <span className="ml-1 opacity-70">{visibleCount}</span>
            </button>;
          })}
        </div>
        {!sections.length ? <p className="mt-4 text-sm text-foreground/55">No menu tabs yet. Add your first one above.</p> : null}
      </section>

      {selectedSection ? <section className="rounded-2xl border bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Selected tab</p>
            {editing("section", selectedSection.id) ? <div className="mt-2 flex flex-wrap items-center gap-3"><input className="rounded-lg border px-3 py-2" value={String(draft?.data.name ?? "")} onChange={(e) => changeDraft("name", e.target.value)} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft?.data.is_visible)} onChange={(e) => changeDraft("is_visible", e.target.checked)} /> Visible</label></div> : <><h2 className="mt-1 text-2xl font-semibold">{selectedSection.name}</h2><p className="mt-1 text-sm text-foreground/60">{selectedSection.is_visible ? "Enabled for the public menu" : "Hidden from the public menu"} · {visibleItemsInSection} visible {visibleItemsInSection === 1 ? "item" : "items"}</p>{selectedSection.is_visible && visibleItemsInSection === 0 ? <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">This tab exists, but it is not shown publicly yet because it has no visible items.</p> : null}</>}
          </div>
          <div className="flex gap-2">
            {editing("section", selectedSection.id) ? <><button className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white" onClick={() => void patch()} disabled={busy}>Save</button><button className="rounded-full border px-4 py-2 text-sm" onClick={() => setDraft(null)} disabled={busy}>Cancel</button></> : <button className="rounded-full border px-4 py-2 text-sm font-semibold" onClick={() => setDraft({ kind: "section", id: selectedSection.id, data: { name: selectedSection.name, slug: selectedSection.slug, is_visible: selectedSection.is_visible } })}>Edit tab</button>}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Step 2</p>
              <h3 className="text-lg font-semibold">Categories in {selectedSection.name}</h3>
              <p className="mt-1 text-sm text-foreground/60">Choose a category to manage its items.</p>
            </div>
            <div className="flex w-full max-w-md gap-2 sm:w-auto">
              <input className="min-w-0 flex-1 rounded-lg border px-3 py-2" placeholder={`New category in ${selectedSection.name}`} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addCategory(); } }} />
              <button className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !newCategoryName.trim()} onClick={() => void addCategory()}>Add category</button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {sectionCategories.map((category) => <button key={category.id} onClick={() => chooseCategory(category.id)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${selectedCategoryId === category.id ? "border-[#189458] bg-[#189458]/10 text-[#116b40]" : "bg-white"}`}>{category.name}</button>)}
          </div>
          {!sectionCategories.length ? <p className="mt-4 rounded-xl border border-dashed p-5 text-sm text-foreground/55">No categories in {selectedSection.name} yet. Add one above, then it will be selected automatically.</p> : null}
        </div>
      </section> : null}

      {selectedSection && selectedCategory ? <section className="rounded-2xl border bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Step 3</p>
            {editing("category", selectedCategory.id) ? <div className="mt-2 flex flex-wrap gap-2"><input className="rounded-lg border px-3 py-2" value={String(draft?.data.name ?? "")} onChange={(e) => changeDraft("name", e.target.value)} /><select className="rounded-lg border px-3 py-2" value={String(draft?.data.section_id ?? selectedSection.id)} onChange={(e) => changeDraft("section_id", e.target.value)}>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div> : <><h2 className="mt-1 text-2xl font-semibold">{selectedCategory.name}</h2><p className="mt-1 text-sm text-foreground/60">Add and manage items in {selectedSection.name} → {selectedCategory.name}.</p></>}
          </div>
          <div className="flex gap-2">{editing("category", selectedCategory.id) ? <><button className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white" onClick={() => void patch()} disabled={busy}>Save</button><button className="rounded-full border px-4 py-2 text-sm" onClick={() => setDraft(null)}>Cancel</button></> : <button className="rounded-full border px-4 py-2 text-sm font-semibold" onClick={() => setDraft({ kind: "category", id: selectedCategory.id, data: { name: selectedCategory.name, section_id: selectedCategory.section_id ?? selectedSection.id } })}>Edit category</button>}</div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1.3fr_.55fr_1.4fr_auto]">
          <input className="rounded-lg border px-3 py-2" placeholder="Item name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
          <input className="rounded-lg border px-3 py-2" type="number" min="0" step="0.01" placeholder="Price" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
          <input className="rounded-lg border px-3 py-2" placeholder="Note / description (optional)" value={newItem.note} onChange={(e) => setNewItem({ ...newItem, note: e.target.value })} />
          <button className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !newItem.name.trim() || newItem.price === ""} onClick={() => void addItem()}>Add item</button>
        </div>

        <div className="mt-6 space-y-2">
          {categoryItems.map((item) => <div key={item.id} className="rounded-xl border bg-[#FAF6F1] p-4">
            {editing("item", item.id) ? <div className="grid gap-2 md:grid-cols-[1.2fr_.5fr_1.3fr_.55fr_auto]">
              <input className="rounded-lg border bg-white px-3 py-2" value={String(draft?.data.name ?? "")} onChange={(e) => changeDraft("name", e.target.value)} />
              <input className="rounded-lg border bg-white px-3 py-2" type="number" step="0.01" min="0" value={Number(draft?.data.price ?? 0)} onChange={(e) => changeDraft("price", Number(e.target.value))} />
              <input className="rounded-lg border bg-white px-3 py-2" value={String(draft?.data.note ?? "")} onChange={(e) => changeDraft("note", e.target.value)} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft?.data.is_visible)} onChange={(e) => changeDraft("is_visible", e.target.checked)} /> Visible</label>
              <div className="flex gap-2"><button className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-white" onClick={() => void patch()} disabled={busy}>Save</button><button className="rounded-full border px-3 py-1.5 text-sm" onClick={() => setDraft(null)}>Cancel</button></div>
            </div> : <div className="flex items-center justify-between gap-4"><div><p className="font-medium">{item.name} <span className="font-normal text-foreground/55">£{Number(item.price).toFixed(2)}</span></p>{item.note ? <p className="text-sm text-foreground/55">{item.note}</p> : null}<p className="mt-1 text-xs text-foreground/45">{item.is_visible ? "Visible" : "Hidden"}</p></div><button className="rounded-full border px-3 py-1.5 text-sm" onClick={() => setDraft({ kind: "item", id: item.id, data: { name: item.name, price: item.price, note: item.note ?? "", is_visible: item.is_visible, position: item.position } })}>Edit</button></div>}
          </div>)}
          {!categoryItems.length ? <p className="rounded-xl border border-dashed p-5 text-sm text-foreground/55">No items in this category yet. Add the first item above.</p> : null}
        </div>
      </section> : null}
    </main>
  );
}
