"use client";

import { useState } from "react";

export default function ShareReviewButton({ url, title, text }: { url: string; title: string; text: string }) {
  const [message, setMessage] = useState("");
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title, text, url });
      else { await navigator.clipboard.writeText(url); setMessage("Link copied"); setTimeout(() => setMessage(""), 1800); }
    } catch {}
  }
  return <span className="inline-flex items-center gap-2"><button type="button" onClick={share} className="rounded-full border px-4 py-2 text-sm font-semibold">Share review</button>{message ? <span className="text-xs text-[#189458]" role="status">{message}</span> : null}</span>;
}
