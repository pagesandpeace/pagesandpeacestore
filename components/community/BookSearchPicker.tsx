"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

export type SelectedBook = {
  source: "pages_and_peace" | "open_library" | "manual";
  id?: string;
  title: string;
  author: string;
  slug?: string;
  workKey?: string | null;
  editionKey?: string | null;
  firstPublishYear?: number | null;
  isbn10?: string | null;
  isbn13?: string | null;
  publisher?: string | null;
  language?: string | null;
  coverUrl?: string | null;
  sourceUrl?: string | null;
};

export default function BookSearchPicker({ onSelect }: { onSelect: (book: SelectedBook | null) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SelectedBook[]>([]);
  const [selected, setSelected] = useState<SelectedBook | null>(null);
  const [loading, setLoading] = useState(false);

  const looksLikeIsbn = useMemo(() => {
    const clean = query.replace(/[^0-9Xx]/g, "");
    return clean.length === 10 || clean.length === 13;
  }, [query]);

  useEffect(() => {
    if (selected || query.trim().length < 2) { setResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/app-core/books/search?query=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await response.json();
        setResults(Array.isArray(data?.results) ? data.results : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query, selected]);

  function choose(book: SelectedBook) {
    setSelected(book);
    setQuery(`${book.title} — ${book.author}`);
    setResults([]);
    onSelect(book);
  }

  function reset() {
    setSelected(null); setQuery(""); setResults([]); onSelect(null);
  }

  return <div>
    <label className="block text-sm font-semibold">Find your book</label>
    <p className="mt-1 text-sm text-neutral-500">Search by title, author or ISBN. Choose the matching book so everyone’s reviews collect in one place.</p>
    <div className="relative mt-3">
      <input value={query} onChange={(event) => { setQuery(event.target.value); if (selected) { setSelected(null); onSelect(null); } }} placeholder="e.g. Intermezzo, Sally Rooney or 978…" className="w-full rounded-xl border px-4 py-3 pr-24" autoComplete="off" />
      {loading ? <span className="absolute right-4 top-3.5 text-xs text-neutral-500">Searching…</span> : selected ? <button type="button" onClick={reset} className="absolute right-3 top-2 rounded-full px-3 py-1.5 text-xs font-semibold text-[#189458]">Change</button> : null}
    </div>
    {!selected && results.length ? <div className="mt-2 overflow-hidden rounded-xl border bg-white shadow-lg">
      {results.map((book, index) => <button key={book.id ?? book.workKey ?? `${book.title}-${book.author}-${index}`} type="button" onClick={() => choose(book)} className="flex w-full items-center gap-4 border-b p-3 text-left last:border-b-0 hover:bg-[#FAF6F1]">
        <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-neutral-100">
          {book.coverUrl ? <Image src={book.coverUrl} alt="" fill sizes="44px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">No cover</div>}
        </div>
        <div className="min-w-0"><p className="font-semibold">{book.title}</p><p className="text-sm text-neutral-600">{book.author}{book.firstPublishYear ? ` · ${book.firstPublishYear}` : ""}</p><p className="mt-1 text-xs text-neutral-400">{book.source === "pages_and_peace" ? "Already in the Pages & Peace community" : "Book data from Open Library"}</p></div>
      </button>)}
    </div> : null}
    {!selected && query.trim().length >= 2 && !loading && results.length === 0 ? <div className="mt-3 rounded-xl border border-dashed p-4 text-sm text-neutral-600">No match yet. You can still add this book manually below.</div> : null}
    {!selected ? <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="text-sm font-semibold">Book title<input name="manualTitle" maxLength={240} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" /></label>
      <label className="text-sm font-semibold">Author<input name="manualAuthor" maxLength={180} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" /></label>
      <label className="text-sm font-semibold md:col-span-2">ISBN <span className="font-normal text-neutral-500">(optional but recommended)</span><input name="manualIsbn" maxLength={32} inputMode="numeric" className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" placeholder={looksLikeIsbn ? query : "ISBN-10 or ISBN-13"} /></label>
    </div> : null}
  </div>;
}
