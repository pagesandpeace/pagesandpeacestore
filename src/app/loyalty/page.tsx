"use client";

import Link from "next/link";
import Image from "next/image";

export default function LoyaltyPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[Montserrat]">
      {/* ---- Hero ---- */}
      <section className="text-center py-20 px-6 border-b border-[#dcd6cf]">
        <Image
          src="/p&p_logo_cream.svg"
          alt="Pages & Peace Logo"
          width={90}
          height={90}
          className="mx-auto mb-6"
        />
        <h1 className="text-4xl font-bold mb-4 text-[var(--accent)]">
          🌿 Pages & Peace Loyalty Club
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-[var(--foreground)]/80 leading-relaxed">
          Earn points with every purchase, unlock exclusive rewards, and enjoy
          member-only updates from your local Rossington Chapter.
        </p>
      </section>

      {/* ---- How it works ---- */}
      <section className="py-16 px-6 max-w-5xl mx-auto grid md:grid-cols-3 gap-10 text-center">
        <div>
          <span className="text-4xl mb-3 block">☕</span>
          <h3 className="font-semibold text-lg mb-2">Earn Points</h3>
          <p className="text-sm text-[#555]">
            Collect 1 point for every £1 you spend in-store or online. Each
            visit brings you closer to your next treat.
          </p>
        </div>
        <div>
          <span className="text-4xl mb-3 block">🎁</span>
          <h3 className="font-semibold text-lg mb-2">Redeem Rewards</h3>
          <p className="text-sm text-[#555]">
            Use your points for free drinks, book discounts, or exclusive member
            gifts.
          </p>
        </div>
        <div>
          <span className="text-4xl mb-3 block">📬</span>
          <h3 className="font-semibold text-lg mb-2">Stay in the Loop</h3>
          <p className="text-sm text-[#555]">
            Members get early invites to events, new Chapter openings, and
            special newsletter features.
          </p>
        </div>
      </section>

      {/* ---- Rewards Table ---- */}
      <section className="bg-white/40 py-16 px-6">
        <h2 className="text-2xl font-semibold text-center mb-10">
          ✨ Reward Tiers
        </h2>
        <div className="overflow-x-auto max-w-4xl mx-auto">
          <table className="w-full text-sm border border-[#dcd6cf] rounded-lg overflow-hidden">
            <thead className="bg-[#189458] text-[var(--background)] uppercase tracking-wide text-xs">
              <tr>
                <th className="py-3 px-4 text-left">Tier</th>
                <th className="py-3 px-4 text-left">Points Required</th>
                <th className="py-3 px-4 text-left">Reward</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[#dcd6cf]">
                <td className="py-3 px-4 font-medium">Reader</td>
                <td className="py-3 px-4">50</td>
                <td className="py-3 px-4">Free coffee or tea</td>
              </tr>
              <tr className="border-t border-[#dcd6cf]">
                <td className="py-3 px-4 font-medium">Booklover</td>
                <td className="py-3 px-4">150</td>
                <td className="py-3 px-4">10% off books</td>
              </tr>
              <tr className="border-t border-[#dcd6cf]">
                <td className="py-3 px-4 font-medium">Collector</td>
                <td className="py-3 px-4">300</td>
                <td className="py-3 px-4">Exclusive tote or mug</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- CTA ---- */}
<section className="py-20 text-center">
  <h3 className="text-2xl font-semibold mb-4">
    Join the Loyalty Club — and the Rossington Chapter 🌿
  </h3>
  <p className="text-[var(--foreground)]/70 mb-8">
    Your story starts here. Sign up once, and your points follow you as
    our Chapters grow.
  </p>

  <div className="flex flex-col sm:flex-row justify-center gap-4">
    <Link
      href="/sign-up?join=loyalty"
      className="btn-primary border-2 border-[var(--gold)] px-10 py-4 rounded-full text-lg font-semibold transition-all hover:bg-[var(--gold)] hover:border-[var(--gold)]"
    >
      Join Now
    </Link>
    <Link
      href="/sign-in"
      className="btn-outline border-2 border-[var(--gold)] px-10 py-4 rounded-full text-lg font-semibold transition-all hover:bg-[var(--gold)] hover:text-[var(--background)] hover:border-[var(--gold)]"
    >
      Already a Member? Sign In
    </Link>
  </div>
</section>

    </main>
  );
}
