"use client";

import { useEffect, useState } from "react";

type Author = {
  id: string;
  name: string;
};

type Props = {
  value: string | null; // author_id
  onChange: (authorId: string | null) => void;
};

export default function AuthorSearchSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Author[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  /* --------------------------------------------------
     LOAD CURRENT AUTHOR NAME (PERSIST SELECTION)
  -------------------------------------------------- */
  useEffect(() => {
    if (!value) {
      setQuery("");
      return;
    }

    let cancelled = false;

    async function loadAuthor() {
      setLoadingInitial(true);

      const res = await fetch(`/api/admin/authors/get?id=${value}`, {
        cache: "no-store",
      });

      if (res.ok) {
        const author: Author = await res.json();
        if (!cancelled) {
          setQuery(author.name);
        }
      }

      setLoadingInitial(false);
    }

    loadAuthor();
    return () => {
      cancelled = true;
    };
  }, [value]);

  /* --------------------------------------------------
     SEARCH AUTHORS
  -------------------------------------------------- */
  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    async function search() {
      const res = await fetch(
        `/api/admin/authors/search?q=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      );

      if (res.ok) {
        setResults(await res.json());
      }
    }

    search();
    return () => controller.abort();
  }, [query, open]);

  return (
    <div className="relative">
      <input
        className="w-full border rounded-md px-3 py-2"
        placeholder="Search author…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(null); // clear selection while typing
        }}
        disabled={loadingInitial}
      />

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-60 overflow-y-auto">
          {results.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No authors found
            </div>
          )}

          {results.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                onChange(a.id);
                setQuery(a.name);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
            >
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
