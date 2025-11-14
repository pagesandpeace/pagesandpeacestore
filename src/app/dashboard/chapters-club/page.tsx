"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getCurrentUserClient } from "@/lib/auth/client";

type Me = {
  id: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  loyaltyprogram?: boolean | null;
};

export default function ChaptersClubPage() {
  const [user, setUser] = useState<Me | null>(null);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUserClient();
      setUser(u);
    })();
  }, []);

  const isMember = Boolean(user?.loyaltyprogram);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[Montserrat] px-6 md:px-8 py-10 md:py-16">
      <section className="mx-auto w-full max-w-4xl">

        {/* Coming Soon Banner */}
        <div className="mb-8 rounded-xl border border-[#F1C40F]/40 bg-[#FFF9E8] px-4 py-3 flex items-center gap-3 shadow-sm">
          <span className="text-[#5DA865] text-xl">✨</span>
          {!isMember ? (
            <p className="text-sm text-[#5B4200]">
              <strong>Chapters Club</strong> is coming soon — as an early user, you get first access when it launches.
            </p>
          ) : (
            <p className="text-sm text-[#5B4200] flex items-center gap-2">
              🎉 You’re already a <strong>Chapters Club Member</strong>.
              More features will unlock soon!
            </p>
          )}
        </div>

        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-widest mb-2">
            Chapters Club
          </h1>
          <p className="text-[var(--foreground)]/70 text-sm max-w-xl">
            Our loyalty + community programme for readers, coffee lovers, and early supporters of Pages & Peace.
          </p>

          {isMember && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#E5F7E4] px-3 py-1 text-xs font-semibold text-[#2f6b3a]">
              <span>Chapters Club Member</span> 🎉
            </div>
          )}
        </header>

        <div className="grid gap-6 md:grid-cols-2">

          {/* LEFT COLUMN – Overview */}
          <div className="rounded-xl border border-[#e0dcd6] bg-white shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">What is Chapters Club?</h2>

            <p className="text-sm text-[#555] leading-relaxed mb-4">
              Chapters Club is our upcoming loyalty and community experience that rewards your visits, purchases, and involvement at Pages & Peace.
              We're rolling out features gradually — members get the earliest benefits.
            </p>

            <ul className="text-sm space-y-3">
              <li>• Earn points on every coffee or book</li>
              <li>• Redeem points for drinks, merch & more</li>
              <li>• Member-only perks, previews & offers</li>
              <li>• Join local reading communities ("Chapters")</li>
              <li>• Early access to new products & events</li>
            </ul>
          </div>

          {/* RIGHT COLUMN – Founder experience */}
          <div className="rounded-xl border border-[#e0dcd6] bg-white shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Founding Member Benefits</h2>

            <p className="text-sm text-[#555] leading-relaxed mb-4">
              Because you're here early, you’ll be part of the small group shaping the future of Pages & Peace rewards.
            </p>

            <div className="bg-[#E5F7E4] border border-[#5DA865]/20 text-[#2f6b3a] px-4 py-3 rounded-lg text-sm">
              <strong>Founding Member Status</strong> 🎉
              <p className="mt-1">
                Early supporters receive exclusive recognition in the app and special perks at launch.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="mt-10 rounded-xl border border-dashed border-[#e0dcd6] bg-white/60 p-6 text-sm text-[#555]">
          <p className="font-medium mb-2">When is it launching?</p>
          <p className="mb-4">
            We're finishing loyalty card syncing, reward balances, and scanning. Chapters Club will roll out in phases very soon.
          </p>

          {!isMember ? (
            <Link
              href="/chapters-club"
              className="inline-block mt-3 px-4 py-2 rounded-full border border-[var(--accent)] text-[var(--accent)] hover:border-[var(--secondary)] hover:text-[var(--secondary)] transition font-semibold"
            >
              Learn More Before Launch →
            </Link>
          ) : (
            <p className="text-sm text-[#2f6b3a] font-medium">
              You’re all set — more perks will appear here soon.
            </p>
          )}
        </div>

      </section>
    </main>
  );
}
