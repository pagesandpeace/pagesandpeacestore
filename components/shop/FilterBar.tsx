"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Genre = { id: string; name: string };
type Author = { id: string; name: string };
type Vibe = { id: string; name: string };
type Theme = { id: string; name: string };

export default function FilterBar({
  genres,
  authors,
  vibes,
  themes,
}: {
  genres: Genre[];
  authors: Author[];
  vibes: Vibe[];
  themes: Theme[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const [inStock, setInStock] = useState(params.get("inStock") === "1");
  const [authorSearch, setAuthorSearch] = useState("");

  const type = params.get("type") ?? "all";

  const update = (key: string, value: string | null) => {
    const q = new URLSearchParams(params.toString());

    if (!value) q.delete(key);
    else q.set(key, value);

    q.set("page", "1");
    router.push(`/shop?${q.toString()}`);
  };

  const selectClass =
    "border px-3 py-2 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D6C28B]";

  return (
    <div className="bg-white border rounded-xl p-4 flex flex-col gap-4 mb-8">
      {/* GLOBAL SEARCH */}
      <input
        className="border px-3 py-2 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D6C28B]"
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
            className={selectClass}
            value={params.get("genre") ?? ""}
            onChange={(e) => update("genre", e.target.value || null)}
          >
            <option value="">All Genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* AUTHOR SEARCH */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter authors…"
              className={selectClass}
              value={authorSearch}
              onChange={(e) => setAuthorSearch(e.target.value)}
            />

            {authorSearch && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-60 overflow-y-auto">
                {authors
                  .filter((a) =>
                    a.name
                      .toLowerCase()
                      .includes(authorSearch.toLowerCase())
                  )
                  .slice(0, 10)
                  .map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="block w-full text-left px-3 py-2 hover:bg-neutral-100 text-gray-900"
                      onClick={() => {
                        update("author", a.id);
                        setAuthorSearch("");
                      }}
                    >
                      {a.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BLIND DATE FILTERS */}
      {type === "blind-date" && (
        <div className="flex flex-wrap gap-4">
          <select
            className={selectClass}
            value={params.get("genre") ?? ""}
            onChange={(e) => update("genre", e.target.value || null)}
          >
            <option value="">All Genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={params.get("vibe") ?? ""}
            onChange={(e) => update("vibe", e.target.value || null)}
          >
            <option value="">All Vibes</option>
            {vibes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={params.get("theme") ?? ""}
            onChange={(e) => update("theme", e.target.value || null)}
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
      <label className="flex items-center gap-2 text-sm text-gray-900">
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
