import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getPublicReviews } from "@/lib/app-core/book-reviews";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Book Reviews", description: "Book reviews and recommendations from the Pages & Peace reading community." };

function Stars({ rating }: { rating: number }) { return <span aria-label={`${rating} out of 5 stars`} className="tracking-widest text-[#189458]">{"★".repeat(rating)}<span className="text-neutral-300">{"★".repeat(5-rating)}</span></span>; }

export default async function BookReviewsPage() {
 const reviews = await getPublicReviews();
 return <><Navbar/><main className="min-h-screen bg-[#FAF6F1] text-[#17221f]">
  <section className="border-b bg-white"><div className="mx-auto max-w-6xl px-6 py-16 md:py-20"><p className="text-sm font-semibold uppercase tracking-[.2em] text-[#189458]">The Pages & Peace reading community</p><div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">Books are better when we talk about them.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">Discover what fellow readers loved, find your next book and share the stories that stayed with you.</p></div><Link href="/dashboard/reviews/new" className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#17221f] px-6 py-3 font-semibold text-white">Share a review</Link></div></div></section>
  <section className="mx-auto max-w-6xl px-6 py-12"><div className="mb-6 flex items-end justify-between"><div><p className="text-sm uppercase tracking-widest text-neutral-500">Latest</p><h2 className="mt-1 text-2xl font-semibold">What readers are recommending</h2></div></div>
  {reviews.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{reviews.map(r=><article key={r.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">{r.image_url?<div className="relative aspect-[4/3]"><Image src={r.image_url} alt="" fill className="object-cover"/></div>:null}<div className="p-6"><Stars rating={r.rating}/><Link href={`/books/${r.book.slug}`}><h3 className="mt-3 text-xl font-semibold hover:underline">{r.book.title}</h3></Link><p className="text-sm text-neutral-500">by {r.book.author}</p><p className="mt-4 line-clamp-5 leading-7 text-neutral-700">{r.contains_spoilers?"Contains spoilers · ":""}{r.body}</p><div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-500"><span>Helpful {r.helpful_count}</span><span>Love {r.love_count}</span><span>{r.comment_count} comment{r.comment_count===1?"":"s"}</span></div><Link href={`/books/${r.book.slug}/reviews/${r.share_slug ?? r.id}`} className="mt-4 inline-block text-sm font-semibold text-[#189458] underline">Read & join conversation</Link><div className="mt-5 flex items-center gap-3 border-t pt-4">{r.reviewer.image?<Image src={r.reviewer.image} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover"/>:null}<div><p className="text-sm font-semibold">{r.reviewer.name}</p><p className="text-xs text-neutral-500">{new Date(r.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</p></div></div></div></article>)}</div>:<div className="rounded-2xl border border-dashed p-12 text-center"><h2 className="text-xl font-semibold">Be part of the first chapter.</h2><p className="mt-2 text-neutral-600">There are no community reviews yet.</p><Link href="/dashboard/reviews/new" className="mt-5 inline-block font-semibold text-[#189458] underline">Share the first review</Link></div>}
  </section></main></>;
}
