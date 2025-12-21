"use client";

import Link from "next/link";
import Image from "next/image";

export default function ChaptersClubPage() {
  return (
    <main
      className="
        min-h-screen
        bg-[var(--background)]
        text-[var(--foreground)]
        font-[Montserrat]
        px-6
        py-16
        sm:py-24
      "
    >
      {/* ---------- HERO ---------- */}
      <section className="mx-auto max-w-3xl text-center space-y-6">
        <Image
          src="/p&p_logo_cream.svg"
          alt="Pages & Peace logo"
          width={96}
          height={96}
          priority
          className="mx-auto mb-4"
        />

        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[var(--accent)]">
          Pages & Peace Chapters Club
        </h1>

        <p className="text-base sm:text-lg text-[var(--foreground)]/80 leading-relaxed">
          Earn rewards, collect memories, and belong to something special.
          <br />
          The{" "}
          <span className="font-semibold text-[var(--accent)]">
            Chapters Club
          </span>{" "}
          is our community-first loyalty programme, where every visit,
          purchase, and conversation adds to your story.
        </p>
      </section>

      {/* ---------- DIVIDER ---------- */}
      <div
        aria-hidden
        className="mx-auto my-12 h-px w-24 bg-[var(--gold)]"
      />

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="mx-auto max-w-2xl text-center space-y-6">
        <h2 className="text-2xl font-semibold text-[var(--accent)]">
          How it works
        </h2>

        <ul className="space-y-3 text-base text-[var(--foreground)]/80">
          <li>
            ☕ <strong>Earn points</strong> with every coffee, book, and event
          </li>
          <li>
            🎁 <strong>Unlock perks</strong> like member-only rewards and early
            access
          </li>
          <li>
            📚 <strong>Join your Chapter</strong>, starting with our founding
            home in Rossington
          </li>
          <li>
            💬 <strong>Be part of the story</strong> through shared moments and
            community
          </li>
        </ul>
      </section>

      {/* ---------- CTA ---------- */}
      <div className="mt-14 flex flex-wrap justify-center gap-4">
        <Link
          href="/sign-up?join=loyalty"
          className="
            inline-block
            rounded-full
            px-10
            py-3
            text-lg
            font-semibold
            bg-[#189458]
            text-white
            border-2
            border-[#d4af37]
            hover:bg-[#157c46]
            transition-colors
            shadow-sm
          "
        >
          Join the Club
        </Link>

        <Link
          href="/sign-in"
          className="
            inline-block
            rounded-full
            px-10
            py-3
            text-lg
            font-semibold
            text-[#189458]
            border-2
            border-[#d4af37]
            hover:bg-[#d4af37]
            hover:text-white
            transition-colors
            shadow-sm
          "
        >
          Already a member? Sign in
        </Link>
      </div>

      {/* ---------- CHAPTER IDENTITY ---------- */}
      <section className="mx-auto mt-20 max-w-3xl text-center space-y-4">
        <h3 className="text-xl font-semibold text-[var(--accent)]">
          The Rossington Chapter
        </h3>

        <p className="text-base text-[var(--foreground)]/80 leading-relaxed">
          Every Pages & Peace Chapter is rooted in its local community.
          Rossington is our founding chapter, home to the readers, writers,
          and regulars who help shape what Pages & Peace becomes next.
        </p>
      </section>
    </main>
  );
}
