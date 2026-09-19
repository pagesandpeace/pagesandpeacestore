"use client";

import { useState } from "react";

type Comment = { id: string; body: string; created_at: string; reviewer: { name: string; image: string | null } };

export default function ReviewCommunityActions({ reviewId, initialHelpful, initialLove, initialComments }: { reviewId: string; initialHelpful: number; initialLove: number; initialComments: Comment[] }) {
  const [helpful, setHelpful] = useState(initialHelpful);
  const [love, setLove] = useState(initialLove);
  const [comments, setComments] = useState(initialComments);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function react(reaction: "helpful" | "love") {
    setMessage("");
    const response = await fetch("/api/app-core/book-community/reactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId, reaction }) });
    const data = await response.json().catch(() => null);
    if (response.status === 401) { window.location.href = `/sign-in?callbackURL=${encodeURIComponent(window.location.pathname)}`; return; }
    if (!response.ok) { setMessage(data?.error || "Could not save reaction."); return; }
    setHelpful(data.helpful); setLove(data.love);
  }

  async function postComment(event: React.FormEvent) {
    event.preventDefault(); if (!comment.trim() || busy) return; setBusy(true); setMessage("");
    const response = await fetch("/api/app-core/book-community/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId, body: comment }) });
    const data = await response.json().catch(() => null); setBusy(false);
    if (response.status === 401) { window.location.href = `/sign-in?callbackURL=${encodeURIComponent(window.location.pathname)}`; return; }
    if (!response.ok) { setMessage(data?.error || "Could not post comment."); return; }
    setComments((current) => [...current, data.comment]); setComment("");
  }

  async function reportTarget(target: { reviewId?: string; commentId?: string }) {
    const reason = window.prompt("Report reason: spam, harassment, hate, sexual, privacy, copyright, or other");
    if (!reason) return;
    const normalized = reason.trim().toLowerCase();
    if (!["spam","harassment","hate","sexual","privacy","copyright","other"].includes(normalized)) { setMessage("Choose one of the listed report reasons."); return; }
    const response = await fetch("/api/app-core/book-community/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...target, reason: normalized }) });
    if (response.status === 401) { window.location.href = `/sign-in?callbackURL=${encodeURIComponent(window.location.pathname)}`; return; }
    setMessage(response.ok ? "Thanks. The report has been recorded." : "Could not submit report.");
  }

  return <section className="mt-8 border-t pt-6">
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={() => react("helpful")} className="rounded-full border px-4 py-2 text-sm font-semibold">Helpful · {helpful}</button>
      <button type="button" onClick={() => react("love")} className="rounded-full border px-4 py-2 text-sm font-semibold">Loved this · {love}</button>
      <button type="button" onClick={() => reportTarget({ reviewId })} className="ml-auto text-xs text-neutral-500 underline">Report</button>
    </div>
    {message ? <p className="mt-3 text-sm text-neutral-600" role="status">{message}</p> : null}
    <div className="mt-8"><h2 className="text-xl font-semibold">Conversation <span className="text-neutral-400">({comments.length})</span></h2>
      <div className="mt-4 space-y-4">{comments.map((item) => <article key={item.id} className="rounded-xl bg-[#FAF6F1] p-4"><div className="flex justify-between gap-4"><p className="text-sm font-semibold">{item.reviewer.name}</p><time className="text-xs text-neutral-500">{new Date(item.created_at).toLocaleDateString("en-GB")}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{item.body}</p><button type="button" onClick={() => reportTarget({ commentId: item.id })} className="mt-2 text-[11px] text-neutral-400 underline">Report comment</button></article>)}</div>
      <form onSubmit={postComment} className="mt-5"><label className="sr-only" htmlFor="review-comment">Add a comment</label><textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1200} rows={3} placeholder="Join the conversation…" className="w-full rounded-xl border px-4 py-3" /><button disabled={busy || !comment.trim()} className="mt-2 rounded-full bg-[#17221f] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Posting…" : "Add comment"}</button></form>
    </div>
  </section>;
}
