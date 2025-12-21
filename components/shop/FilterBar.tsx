"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function FilterBar({
  genres,
  authors,
  vibes,
  themes,
}: {
  genres: { id: string; name: string }[];
  authors: string[];
  vibes: { id: string; name: string }[];
  themes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const [inStock, setInStock] = useState(params.get("inStock") === "1");

  const type = params.get("type") ?? "all";

  const update = (key: string, value: string | null) => {
    const q = new URLSearchParams(params.toString());

    if (value === null || value === "") q.delete(key);
    else q.set(key, value);

    q.set("page", "1"); // reset pagination
    router.push(`/shop?${q.toString()}`);
  };

  return (
    <div className="bg-white border rounded-xl p-4 flex flex-col gap-4 mb-8">

      {/* SEARCH */}
      <input
        className="border px-3 py-2 rounded"
        placeholder="Search products…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          update("search", e.target.value);
        }}
      />

      {/* BOOK FILTERS */}
      {type === "book" && (
        <div className="flex flex-wrap gap-4">

          {/* GENRE */}
          <select
            className="border px-3 py-2 rounded"
            value={params.get("genre") ?? ""}
            onChange={(e) => update("genre", e.target.value)}
          >
            <option value="">All Genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* AUTHOR */}
          <select
            className="border px-3 py-2 rounded"
            value={params.get("author") ?? ""}
            onChange={(e) => update("author", e.target.value)}
          >
            <option value="">All Authors</option>
            {authors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

        </div>
      )}

      {/* BLIND DATE FILTERS */}
      {type === "blind-date" && (
        <div className="flex flex-wrap gap-4">

          {/* GENRE */}
          <select
            className="border px-3 py-2 rounded"
            value={params.get("genre") ?? ""}
            onChange={(e) => update("genre", e.target.value)}
          >
            <option value="">All Genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* VIBE — dynamic from DB */}
          <select
            className="border px-3 py-2 rounded"
            value={params.get("vibe") ?? ""}
            onChange={(e) => update("vibe", e.target.value)}
          >
            <option value="">All Vibes</option>
            {vibes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          {/* THEME — dynamic from DB */}
          <select
            className="border px-3 py-2 rounded"
            value={params.get("theme") ?? ""}
            onChange={(e) => update("theme", e.target.value)}
          >
            <option value="">All Themes</option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

        </div>
      )}

      {/* IN STOCK */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={inStock}
          onChange={() => {
            setInStock(!inStock);
            update("inStock", !inStock ? "1" : null);
          }}
        />
        In Stock Only
      </label>
    </div>
  );
}
