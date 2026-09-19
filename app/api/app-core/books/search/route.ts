import { NextResponse } from "next/server";
import { findInternalBooks } from "@/lib/app-core/book-reviews";

export const dynamic = "force-dynamic";

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  edition_key?: string[];
  publisher?: string[];
  language?: string[];
};

function cleanIsbn(value: string) {
  const cleaned = value.toUpperCase().replace(/[^0-9X]/g, "");
  return cleaned.length === 10 || cleaned.length === 13 ? cleaned : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("query") ?? "").trim();
  if (query.length < 2 || query.length > 160) return NextResponse.json({ results: [] });

  const internalPromise = findInternalBooks(query, 8);
  const isbn = cleanIsbn(query);
  const params = new URLSearchParams({
    limit: "8",
    fields: "key,title,author_name,first_publish_year,cover_i,isbn,edition_key,publisher,language",
  });
  if (isbn) params.set("q", `isbn:${isbn}`);
  else params.set("q", query);

  const externalPromise = fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
    headers: { "User-Agent": "PagesAndPeaceCommunity/1.0 (https://pagesandpeace.co.uk)" },
    next: { revalidate: 3600 },
  }).then(async (response) => response.ok ? response.json() as Promise<{ docs?: OpenLibraryDoc[] }> : { docs: [] }).catch(() => ({ docs: [] as OpenLibraryDoc[] }));

  const [internal, external] = await Promise.all([internalPromise, externalPromise]);
  const internalWorkKeys = new Set(internal.map((book) => book.open_library_work_key).filter(Boolean));
  const externalResults = (external.docs ?? []).flatMap((doc) => {
    if (!doc.key || !doc.title || !doc.author_name?.[0] || internalWorkKeys.has(doc.key)) return [];
    const isbns = [...new Set(doc.isbn ?? [])];
    const isbn13 = isbns.find((value) => /^\d{13}$/.test(value)) ?? null;
    const isbn10 = isbns.find((value) => /^(?:\d{9}[\dX])$/.test(value)) ?? null;
    const editionKey = doc.edition_key?.[0] ?? null;
    return [{
      source: "open_library" as const,
      workKey: doc.key,
      editionKey,
      title: doc.title,
      author: doc.author_name[0],
      firstPublishYear: doc.first_publish_year ?? null,
      isbn10,
      isbn13,
      publisher: doc.publisher?.[0] ?? null,
      language: doc.language?.[0] ?? null,
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      sourceUrl: editionKey ? `https://openlibrary.org/books/${editionKey}` : `https://openlibrary.org${doc.key}`,
    }];
  });

  return NextResponse.json({
    results: [
      ...internal.map((book) => ({
        source: "pages_and_peace" as const,
        id: book.id,
        title: book.title,
        author: book.author,
        slug: book.slug,
        firstPublishYear: book.first_publish_year,
        coverUrl: book.cover_image_url,
        workKey: book.open_library_work_key,
      })),
      ...externalResults,
    ].slice(0, 12),
  }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
