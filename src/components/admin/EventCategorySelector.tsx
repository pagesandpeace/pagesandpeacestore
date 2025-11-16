"use client";

import { useEffect, useState } from "react";

type Category = { id: string; name: string; slug: string };

type Props = {
  selected: Category[];
  onChange: (cats: Category[]) => void;
};

export default function EventCategorySelector({ selected, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Load categories
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/event-categories/list");
      const json = await res.json();
      setCategories(json);
      setLoading(false);
    }
    load();
  }, []);

  function toggle(cat: Category) {
    const exists = selected.some((c) => c.id === cat.id);

    if (exists) {
      onChange(selected.filter((c) => c.id !== cat.id));
    } else {
      onChange([...selected, cat]);
    }
  }

  async function createCategory(name: string) {
    const res = await fetch("/api/admin/event-categories/create", {
      method: "POST",
      body: JSON.stringify({ name }),
    });

    const json = await res.json();

    if (!selected.some((c) => c.id === json.id)) {
      onChange([...selected, json]);
    }

    setCategories([...categories, json]);
  }

  if (loading) return <p>Loading categories…</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Categories</p>

      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map((c) => (
          <span
            key={c.id}
            className="px-3 py-1 bg-neutral-200 rounded-full text-sm cursor-pointer"
            onClick={() => toggle(c)}
          >
            {c.name} ×
          </span>
        ))}
      </div>

      {/* All Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`px-3 py-1 border rounded-full text-xs ${
              selected.some((s) => s.id === c.id)
                ? "bg-[#111] text-white"
                : "bg-neutral-100"
            }`}
            onClick={() => toggle(c)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Quick Add Buttons */}
      <div className="flex flex-wrap gap-2 pt-2 text-xs">
        {[
          "Silent Reading Night",
          "Poetry Night",
          "Book Club",
          "Kids Storytime",
          "Author Q&A",
          "Creative Writing",
          "Book Launch",
          "Wellbeing",
        ].map((name) => (
          <button
            key={name}
            type="button"
            className="px-2 py-1 border rounded bg-neutral-50"
            onClick={() => createCategory(name)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
