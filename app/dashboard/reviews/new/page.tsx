"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BookSearchPicker, { type SelectedBook } from "@/components/community/BookSearchPicker";

export default function NewReviewPage() {
  const router = useRouter();
  const [book, setBook] = useState<SelectedBook | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    form.set("containsSpoilers", form.get("containsSpoilers") === "on" ? "true" : "false");
    if (book) form.set("selectedBook", JSON.stringify(book));
    const response = await fetch("/api/app-core/book-reviews", { method: "POST", body: form });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) { setError(data?.error || "We could not publish your review."); return; }
    router.push(`/books/${data.bookSlug}/reviews/${data.reviewSlug ?? data.reviewId}`);
    router.refresh();
  }

  return <main className="mx-auto max-w-3xl px-2 py-6 md:px-6">
    <Link href="/dashboard/reviews" className="text-sm underline">← My reviews</Link>
    <div className="mt-6 rounded-2xl border bg-white p-6 md:p-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#189458]">Share with the community</p>
      <h1 className="mt-2 text-3xl font-semibold">Review a book</h1>
      <p className="mt-2 text-neutral-600">Find the book you read, or add it if it is new to the Pages & Peace community. Your review becomes part of the shared book page for everyone.</p>
      <form onSubmit={submit} className="mt-8 space-y-6">
        <BookSearchPicker onSelect={setBook} />
        <fieldset><legend className="text-sm font-semibold">Your rating</legend><div className="mt-2 flex flex-wrap gap-2">{[1,2,3,4,5].map((rating) => <label key={rating} className="cursor-pointer rounded-full border px-4 py-2"><input type="radio" name="rating" value={rating} required className="mr-2" />{rating} ★</label>)}</div></fieldset>
        <label className="block text-sm font-semibold">Your review<textarea name="body" required minLength={40} maxLength={5000} rows={8} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" placeholder="What did you love, question or keep thinking about?" /></label>
        <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm"><input type="checkbox" name="containsSpoilers" className="mt-1" /><span><strong>Contains spoilers</strong><br /><span className="text-neutral-600">Readers will see a spoiler warning before the review text.</span></span></label>
        <label className="block text-sm font-semibold">Add your own photo <span className="font-normal text-neutral-500">(optional, up to 8 MB)</span><input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-2 block w-full text-sm" /></label>
        {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        <button disabled={busy} className="rounded-full bg-[#17221f] px-6 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Publishing…" : "Publish review"}</button>
        <p className="text-xs leading-5 text-neutral-500">Reviews are public. Share your own words and photos, avoid personal information about other people, and mark spoilers when relevant.</p>
      </form>
    </div>
  </main>;
}
