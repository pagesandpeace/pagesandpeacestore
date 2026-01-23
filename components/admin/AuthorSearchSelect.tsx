"use client";

import { useEffect, useRef, useState } from "react";

type Author = {
  id: string;
  name: string;
};

type Props = {
  value: string | null; // author_id
  onChange: (authorId: string | null) => void;
};

export default function AuthorSearchSelect({ value, onChange }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Author[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  /* --------------------------------------------------
     CLOSE ON OUTSIDE CLICK
  -------------------------------------------------- */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* --------------------------------------------------
     LOAD CURRENT AUTHOR NAME (PERSIST SELECTION)
  -------------------------------------------------- */
  useEffect(() => {
    if (!value) return;

    let cancelled = false;

    async function loadAuthor() {
      setLoadingInitial(true);

      try {
        const res = await fetch(`/api/admin/authors/get?id=${value}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const author: Author = await res.json();
        if (!cancelled) {
          setQuery(author.name);
          setOpen(false);
        }
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    }

    loadAuthor();
    return () => {
      cancelled = true;
    };
  }, [value]);

  /* --------------------------------------------------
     SEARCH AUTHORS (ASYNC ONLY)
  -------------------------------------------------- */
  useEffect(() => {
    if (!open || query.trim().length === 0) return;

    const controller = new AbortController();

    async function search() {
      try {
        const res = await fetch(
          `/api/admin/authors/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );

        if (!res.ok) return;

        const data: Author[] = await res.json();
        setResults(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Author search failed:", err);
      }
    }

    search();
    return () => controller.abort();
  }, [query, open]);

  /* --------------------------------------------------
     INPUT HANDLERS (STATE DERIVATION LIVES HERE)
  -------------------------------------------------- */
  function handleChange(value: string) {
    setQuery(value);
    onChange(null);

    if (!value.trim()) {
      setOpen(false);
      setResults([]);
    } else {
      setOpen(true);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        className="w-full border rounded-md px-3 py-2"
        placeholder="Search author…"
        value={query}
        disabled={loadingInitial}
        onFocus={() => {
          if (query.trim()) setOpen(true);
        }}
        onChange={(e) => handleChange(e.target.value)}
      />

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow max-h-60 overflow-y-auto">
          {results.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                onChange(a.id);
                setQuery(a.name);
                setOpen(false);
                setResults([]);
              }}
              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
            >
              {a.name}
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow">
          <div className="px-3 py-2 text-sm text-gray-500">
            No authors found
          </div>
        </div>
      )}
    </div>
  );
}
