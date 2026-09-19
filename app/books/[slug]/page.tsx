import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ReadingStatusButtons from "@/components/community/ReadingStatusButtons";
import { getPublicBook } from "@/lib/app-core/book-reviews";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicBook(slug);
  if (!data) return { title: "Book" };
  return {
    title: `${data.book.title} by ${data.book.author}`,
    description: `Read ratings, reviews and community conversation about ${data.book.title} by ${data.book.author} at Pages & Peace.`,
    alternates: { canonical: `/books/${slug}` },
  };
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicBook(slug);
  if (!data) notFound();
  const average = data.reviews.length ? data.reviews.reduce((sum, review) => sum + review.rating, 0) / data.reviews.length : 0;
  const cover = data.book.cover_image_url ?? data.editions.find((edition) => edition.cover_image_url)?.cover_image_url ?? null;
  const isbn = data.editions.find((edition) => edition.isbn13)?.isbn13 ?? data.editions.find((edition) => edition.isbn10)?.isbn10 ?? null;

  return <><Navbar /><main className="min-h-screen bg-[#FAF6F1] text-[#17221f]">
    <section className="border-b bg-white"><div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-[180px_1fr] md:items-start">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-neutral-100 shadow-sm">{cover ? <Image src={cover} alt={`Cover of ${data.book.title}`} fill sizes="180px" className="object-cover" /> : <div className="flex h-full items-center justify-center p-5 text-center text-sm text-neutral-400">Cover unavailable</div>}</div>
      <div><Link href="/book-reviews" className="text-sm font-semibold text-[#189458] underline">← Book reviews</Link><p className="mt-8 text-sm uppercase tracking-widest text-neutral-500">Pages & Peace community book</p><h1 className="mt-2 text-4xl font-semibold md:text-5xl">{data.book.title}</h1><p className="mt-2 text-xl text-neutral-600">by {data.book.author}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4">{data.reviews.length ? <p className="font-semibold text-[#189458]">★ {average.toFixed(1)} · {data.reviews.length} review{data.reviews.length === 1 ? "" : "s"}</p> : <p className="text-neutral-500">No ratings yet</p>}{data.book.first_publish_year ? <span className="text-sm text-neutral-500">First published {data.book.first_publish_year}</span> : null}{isbn ? <span className="text-sm text-neutral-500">ISBN {isbn}</span> : null}</div>
        <ReadingStatusButtons bookId={data.book.id} initialCounts={data.reading} />
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/dashboard/reviews/new" className="inline-flex rounded-full bg-[#17221f] px-5 py-3 font-semibold text-white">Review this book</Link>{data.book.open_library_work_key ? <a href={`https://openlibrary.org${data.book.open_library_work_key}`} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full border px-5 py-3 text-sm font-semibold">Book data ↗</a> : null}</div>
      </div>
    </div></section>
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm uppercase tracking-widest text-neutral-500">Community conversation</p><h2 className="mt-1 text-2xl font-semibold">Reader reviews</h2></div><p className="text-sm text-neutral-500">{data.reading.read} readers marked this read</p></div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">{data.reviews.map((review) => <article key={review.id} className="rounded-2xl border bg-white p-6"><div className="flex justify-between gap-4"><div><p className="font-semibold">{review.reviewer.name}</p><p className="mt-1 tracking-widest text-[#189458]" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}<span className="text-neutral-200">{"★".repeat(5-review.rating)}</span></p></div><time className="text-sm text-neutral-500">{new Date(review.created_at).toLocaleDateString("en-GB")}</time></div>{review.contains_spoilers ? <p className="mt-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Contains spoilers</p> : null}<p className="mt-4 line-clamp-5 whitespace-pre-wrap leading-7 text-neutral-700">{review.body}</p><div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4 text-xs text-neutral-500"><span>Helpful {review.helpful_count}</span><span>Love {review.love_count}</span><span>{review.comment_count} comment{review.comment_count === 1 ? "" : "s"}</span><Link href={`/books/${slug}/reviews/${review.share_slug ?? review.id}`} className="ml-auto font-semibold text-[#189458] underline">Read & join conversation</Link></div></article>)}</div>
      {!data.reviews.length ? <div className="mt-6 rounded-2xl border border-dashed p-10 text-center"><h3 className="font-semibold">Start the conversation.</h3><p className="mt-2 text-neutral-600">Be the first Pages & Peace reader to review this book.</p><Link href="/dashboard/reviews/new" className="mt-4 inline-block font-semibold text-[#189458] underline">Write a review</Link></div> : null}
    </section>
  </main></>;
}
