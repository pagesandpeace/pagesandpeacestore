"use client";

import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-[var(--background)] font-[Montserrat]">
      {/* --- Logo + Tagline --- */}
      <div className="flex flex-col items-center">
        <Image
          src="/p&p_logo_cream.svg"
          alt="Pages & Peace logo"
          width={160}
          height={160}
          priority
          className="mb-6"
        />
        <h1 className="text-4xl sm:text-6xl tracking-widest text-[var(--foreground)]">
          PAGES & PEACE
        </h1>
        <p className="mt-4 text-[var(--foreground)]/80 text-lg max-w-md leading-relaxed">
          ☕ Every community needs a chapter.
        </p>
      </div>

      {/* --- Call to Action --- */}
<div className="flex flex-col sm:flex-row gap-4 mt-12">
  <Link
    href="/shop"
    className="inline-block px-6 py-3 text-[var(--accent)] font-semibold border-2 border-[var(--accent)] rounded-full hover:border-[var(--secondary)] hover:text-[var(--secondary)] transition-all"
  >
    🛍️ Browse the Shop
  </Link>
  <Link
    href="/menu"
    className="inline-block px-6 py-3 text-[var(--accent)] font-semibold border-2 border-[var(--accent)] rounded-full hover:border-[var(--secondary)] hover:text-[var(--secondary)] transition-all"
  >
    🍽️ View the Menu
  </Link>
</div>


      {/* --- Auth Prompt --- */}
      <div className="mt-12">
        <p className="text-[var(--foreground)]/70 mb-3">
          Ready to make it personal?
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-in"
            className="text-[var(--accent)] font-semibold hover:text-[var(--secondary)] transition"
          >
            Sign In
          </Link>
          <span className="text-[var(--accent)]/50">|</span>
          <Link
            href="/sign-up"
            className="text-[var(--accent)] font-semibold hover:text-[var(--secondary)] transition"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
