"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Review = { id:string; rating:number; body:string; contains_spoilers:boolean; book:{title:string;author:string;slug:string}|null };

export default function EditReviewPage() {
  const params = useParams<{ reviewId: string }>();
  const router = useRouter();
  const [review, setReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [spoilers, setSpoilers] = useState(false);
  const [message, setMessage] = useState("Loading…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/app-core/book-reviews/mine").then((response) => response.json()).then((data) => {
      const item = (data?.reviews ?? []).find((entry: Review) => entry.id === params.reviewId);
      if (!item) { setMessage("Review not found."); return; }
      setReview(item); setRating(item.rating); setBody(item.body); setSpoilers(item.contains_spoilers); setMessage("");
    }).catch(() => setMessage("Could not load review."));
  }, [params.reviewId]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch(`/api/app-core/book-reviews/${params.reviewId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({rating,body,containsSpoilers:spoilers}) });
    const data = await response.json().catch(() => null); setBusy(false);
    if (!response.ok) { setMessage(data?.error || "Could not save review."); return; }
    if (review?.book) router.push(`/books/${review.book.slug}`);
    else router.push("/dashboard/reviews");
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Remove this review from the public community? This can be moderated/recovered in the database, but it will disappear from public pages.")) return;
    setBusy(true);
    const response = await fetch(`/api/app-core/book-reviews/${params.reviewId}`, { method:"DELETE" });
    setBusy(false);
    if (!response.ok) { setMessage("Could not remove review."); return; }
    router.push("/dashboard/reviews"); router.refresh();
  }

  if (!review) return <main className="mx-auto max-w-3xl p-8"><p>{message}</p></main>;
  return <main className="mx-auto max-w-3xl px-2 py-6 md:px-6"><Link href="/dashboard/reviews" className="text-sm underline">← My reviews</Link><div className="mt-6 rounded-2xl border bg-white p-6 md:p-8"><p className="text-sm uppercase tracking-widest text-[#189458]">Edit your review</p><h1 className="mt-2 text-3xl font-semibold">{review.book?.title ?? "Book review"}</h1>{review.book ? <p className="mt-1 text-neutral-500">by {review.book.author}</p> : null}<form onSubmit={save} className="mt-8 space-y-5"><fieldset><legend className="text-sm font-semibold">Rating</legend><div className="mt-2 flex flex-wrap gap-2">{[1,2,3,4,5].map((value)=><label key={value} className="rounded-full border px-4 py-2"><input type="radio" checked={rating===value} onChange={()=>setRating(value)} className="mr-2"/>{value} ★</label>)}</div></fieldset><label className="block text-sm font-semibold">Review<textarea value={body} onChange={(event)=>setBody(event.target.value)} minLength={40} maxLength={5000} required rows={9} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal"/></label><label className="flex gap-3 rounded-xl bg-amber-50 p-4 text-sm"><input type="checkbox" checked={spoilers} onChange={(event)=>setSpoilers(event.target.checked)} className="mt-1"/><span><strong>Contains spoilers</strong><br/><span className="text-neutral-600">Keep the warning accurate for other readers.</span></span></label>{message?<p className="text-sm text-red-700">{message}</p>:null}<div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-full bg-[#17221f] px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?"Saving…":"Save changes"}</button><button type="button" onClick={remove} disabled={busy} className="rounded-full border border-red-300 px-5 py-3 text-sm font-semibold text-red-700">Remove review</button></div></form></div></main>;
}
