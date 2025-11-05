"use client";

import Link from "next/link";
import Image from "next/image";

export default function ChaptersClubPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[Montserrat] flex flex-col items-center justify-center px-6 py-16 sm:py-24">
      {/* ---- Hero Section ---- */}
      <div className="text-center max-w-3xl space-y-6">
        <Image
          src="/p&p_logo_cream.svg"
          alt="Pages & Peace logo"
          width={100}
          height={100}
          priority
          className="mx-auto mb-4"
        />
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-wide text-[var(--accent)]">
          🌿 Pages & Peace Chapters Club
        </h1>
        <p className="text-base sm:text-lg text-[var(--foreground)]/80 leading-relaxed">
          Earn rewards, collect memories, and belong to something special.  
          The <span className="font-semibold text-[var(--accent)]">Chapters Club</span> is our community-first loyalty program —  
          where every purchase, conversation, and connection helps you grow your story.
        </p>
      </div>

      {/* ---- Divider ---- */}
      <div className="h-px w-24 bg-[var(--gold)] my-12" />

      {/* ---- How It Works ---- */}
      <section className="text-center max-w-2xl space-y-6">
        <h2 className="text-2xl font-semibold text-[var(--accent)]">
          How It Works
        </h2>
        <ul className="space-y-3 text-[var(--foreground)]/80 text-base">
          <li>☕ <strong>Earn points</strong> with every coffee, book, and event.</li>
          <li>🎁 <strong>Unlock perks</strong> — from member-only rewards to early previews.</li>
          <li>📚 <strong>Join your Chapter</strong> — starting with our founding home in Rossington.</li>
          <li>💬 <strong>Be part of the story</strong> — share, support, and connect with readers like you.</li>
        </ul>
      </section>

      {/* ---- Call to Action ---- */}
<div className="mt-14 flex flex-col sm:flex-row flex-wrap justify-center gap-4">
  {/* 🟢 Join the Club */}
  <Link
    href="/sign-up?join=loyalty"
    className="inline-block text-center rounded-full px-10 py-3 text-lg font-semibold
               bg-[#189458]
               text-white
               border-2 border-[#d4af37]
               hover:bg-[#157c46] hover:border-[#d4af37]
               transition-all duration-200 shadow-sm"
  >
    Join the Club
  </Link>

  {/* ⚪ Already a Member */}
  <Link
    href="/sign-in"
    className="inline-block text-center rounded-full px-10 py-3 text-lg font-semibold
               text-[#189458]
               border-2 border-[#d4af37]
               hover:bg-[#d4af37] hover:text-white
               transition-all duration-200 shadow-sm"
  >
    Already a Member? Sign In
  </Link>

  {/* 🔙 Back to Home */}
  <Link
    href="/"
    className="inline-block text-center rounded-full px-10 py-3 text-lg font-medium
               text-[#111]
               border-2 border-[#dcd6cf]
               hover:bg-[#f0ece7]
               transition-all duration-200"
  >
    ← Back to Home
  </Link>
</div>



      {/* ---- Chapter Identity ---- */}
      <section className="mt-20 text-center max-w-3xl space-y-4">
        <h3 className="text-xl font-semibold text-[var(--accent)]">
          The Rossington Chapter 🌍
        </h3>
        <p className="text-[var(--foreground)]/80 text-base leading-relaxed">
          Every Pages & Peace Chapter is rooted in its local community.  
          Our Rossington café and bookshop is the first — the founding Chapter.  
          Members here are our storytellers, readers, and friends who help shape what comes next.
        </p>
      </section>
    </main>
  );
}
