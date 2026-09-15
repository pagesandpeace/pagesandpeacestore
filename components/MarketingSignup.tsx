"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function MarketingSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const response = await fetch("/api/marketing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website: "" }),
      });
      if (!response.ok) throw new Error("Unable to subscribe");
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="rounded-[2rem] bg-[#dfebe6] px-7 py-10 sm:px-10" aria-labelledby="marketing-signup-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#477460]">Stay in the loop</p>
      <h2 id="marketing-signup-heading" className="mt-3 font-serif text-3xl text-[#17221f]">The next good thing, in your inbox.</h2>
      <p className="mt-3 max-w-xl leading-7 text-[#40514a]">Occasional emails about new events, book recommendations and café news. No account needed.</p>
      <form className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row" onSubmit={subscribe}>
        <label className="sr-only" htmlFor="marketing-email">Email address</label>
        <input id="marketing-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="min-h-12 flex-1 rounded-full border border-[#477460]/30 bg-white px-5 text-[#17221f] outline-none ring-[#477460] focus:ring-2" />
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <button type="submit" disabled={status === "loading"} className="min-h-12 rounded-full bg-[#17221f] px-6 text-sm font-semibold text-white transition hover:bg-[#477460] disabled:opacity-60">{status === "loading" ? "Signing up…" : "Keep me updated"}</button>
      </form>
      {status === "success" ? <p className="mt-3 text-sm font-medium text-[#245d45]" role="status">You’re on the list — welcome.</p> : null}
      {status === "error" ? <p className="mt-3 text-sm font-medium text-red-700" role="alert">We could not sign you up just now. Please try again.</p> : null}
      <p className="mt-4 text-xs leading-5 text-[#40514a]">By signing up, you agree to receive marketing emails. You can unsubscribe at any time. Read our <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
    </section>
  );
}
