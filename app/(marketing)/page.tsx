"use client";

import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Fill visible viewport minus footer */}
      <main
        className="
          min-h-[calc(100dvh-4rem)]
          md:min-h-[calc(100svh-4rem)]
          overflow-hidden

          flex flex-col items-center justify-start
          px-6 py-8
          bg-[var(--background)] text-[var(--foreground)] font-[Montserrat]
        "
      >
        {/* Logo + Tagline */}
        <div className="flex flex-col items-center mt-4">
          <Image
            src="/p&p_logo_cream.svg"
            alt="Pages & Peace logo"
            width={160}
            height={160}
            priority
            className="mb-3"
          />

          <h1
            className="
              w-full max-w-[24ch]
              text-center text-balance
              text-4xl sm:text-6xl
              leading-tight
              tracking-widest
            "
          >
            ☕ Every community needs a chapter.
          </h1>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
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

        {/* Auth Prompt */}
        <div className="mt-6 text-center">
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
    </>
  );
}
