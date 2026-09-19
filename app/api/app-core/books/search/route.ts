import { NextResponse } from "next/server";
import { findInternalBooks } from "@/lib/app-core/book-reviews";

export const dynamic = "force-dynamic";

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
};

type IsbnEdition = {
  key?: string;
  title?: string;
  publish_date?: string;
  publishers?: string[];
  languages?: { key?: string }[];
  works?: { key?: string }[];
};

type BooksApiData = {
  title?: string;
  authors?: { name?: string }[];
  publishers?: { name?: string }[];
  identifiers?: { isbn_10?: string[]; isbn_13?: string[] };
  cover?: { small?: string; medium?: string; large?: string };
};

function cleanIsbn(value: string) {
  const cleaned = value.toUpperCase().replace(/[^0-9X]/g, "");
  return cleaned.length === 10 || cleaned.length === 13 ? cleaned : null;
}

function yearFromDate(value?: string) {
  if (!value) return null;
  const match = value.match(/\b(1[0-9]{3}|20[0-9]{2}|21[0-9]{2})\b/);
  return match ? Number(match[1]) : null;
}

async function exactIsbnResult(isbn: string) {
  const headers = { "User-Agent": "PagesAndPeaceCommunity/1.0 (https://pagesandpeace.co.uk)" };
  const [editionResponse, booksResponse] = await Promise.all([
    fetch(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`, { headers, next: { revalidate: 86400 } }),
    fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`, { headers, next: { revalidate: 86400 } }),
  ]);
  if (!editionResponse.ok) return null;
  const edition = await editionResponse.json() as IsbnEdition;
  const booksJson = booksResponse.ok ? await booksResponse.json() as Record<string, BooksApiData> : {};
  const bookData = booksJson[`ISBN:${isbn}`] ?? {};
  const title = edition.title ?? bookData.title;
  const author = bookData.authors?.find((item) => item.name)?.name;
  const workKey = edition.works?.find((item) => item.key)?.key ?? null;
  if (!title || !author || !workKey) return null;
  const isbn13 = bookData.identifiers?.isbn_13?.[0] ?? (isbn.length === 13 ? isbn : null);
  const isbn10 = bookData.identifiers?.isbn_10?.[0] ?? (isbn.length === 10 ? isbn : null);
  return {
    source: "open_library" as const,
    workKey,
    editionKey: edition.key?.replace("/books/", "") ?? null,
    title,
    author,
    firstPublishYear: null,
    editionPublishedYear: yearFromDate(edition.publish_date),
    isbn10,
    isbn13,
    publisher: edition.publishers?.[0] ?? bookData.publishers?.[0]?.name ?? null,
    language: edition.languages?.[0]?.key?.replace("/languages/", "") ?? null,
    coverUrl: bookData.cover?.large ?? bookData.cover?.medium ?? (isbn13 ? `https://covers.openlibrary.org/b/isbn/${isbn13}-M.jpg` : null),
    sourceUrl: edition.key ? `https://openlibrary.org${edition.key}` : `https://openlibrary.org/isbn/${isbn}`,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("query") ?? "").trim();
  if (query.length < 2 || query.length > 160) return NextResponse.json({ results: [] });

  const internalPromise = findInternalBooks(query, 8);
  const isbn = cleanIsbn(query);

  if (isbn) {
    const [internal, exact] = await Promise.all([internalPromise, exactIsbnResult(isbn).catch(() => null)]);
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
        ...(exact ? [exact] : []),
      ].slice(0, 12),
    }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  }

  const params = new URLSearchParams({
    q: query,
    limit: "8",
    fields: "key,title,author_name,first_publish_year,cover_i",
  });
  const externalPromise = fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
    headers: { "User-Agent": "PagesAndPeaceCommunity/1.0 (https://pagesandpeace.co.uk)" },
    next: { revalidate: 3600 },
  }).then(async (response) => response.ok ? await response.json() as { docs?: OpenLibraryDoc[] } : { docs: [] as OpenLibraryDoc[] }).catch(() => ({ docs: [] as OpenLibraryDoc[] }));

  const [internal, external] = await Promise.all([internalPromise, externalPromise]);
  const internalWorkKeys = new Set(internal.map((book) => book.open_library_work_key).filter(Boolean));
  const externalResults = (external.docs ?? []).flatMap((doc) => {
    if (!doc.key || !doc.title || !doc.author_name?.[0] || internalWorkKeys.has(doc.key)) return [];
    return [{
      source: "open_library" as const,
      workKey: doc.key,
      editionKey: null,
      title: doc.title,
      author: doc.author_name[0],
      firstPublishYear: doc.first_publish_year ?? null,
      editionPublishedYear: null,
      isbn10: null,
      isbn13: null,
      publisher: null,
      language: null,
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      sourceUrl: `https://openlibrary.org${doc.key}`,
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
