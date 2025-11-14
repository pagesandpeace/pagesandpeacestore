"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ✔ Correct client-side user fetch
import { getCurrentUserClient } from "@/lib/auth/client";

type User = { id: string; name?: string | null; email: string } | null;

export default function GiftVoucherDetailsPage() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUserClient();
      setUser(u ?? null);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-16 font-[Montserrat]">
      <section className="max-w-4xl mx-auto text-center mb-12">
        <Image
          src="/gift-card.svg"
          alt="Pages & Peace Gift Voucher"
          width={300}
          height={300}
          className="mx-auto mb-6 rounded-xl shadow-md"
        />

        <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4">
          Pages & Peace Gift Voucher
        </h1>

        <p className="text-[var(--foreground)]/80 text-lg max-w-2xl mx-auto">
          Treat someone special to books, coffee & calm.  
          Choose an amount, add a personalised message, and send instantly or print at home.
        </p>

        <div className="mt-6 text-sm text-[var(--foreground)]/60">
          Valid for 24 months • Usable across multiple visits • Works with all products in store
        </div>
      </section>

      <section className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-md border border-[var(--accent)]/20">
        {!loading && !user && (
          <div className="text-center">
            <p className="text-[var(--foreground)]/80 text-sm mb-4">
              You’ll need an account so we can send receipts and help you manage your vouchers.
            </p>

            <div className="flex justify-center gap-3 mt-3 flex-wrap">
              <Link
                href={`/sign-in?callbackURL=${encodeURIComponent("/gift-vouchers")}`}
                className="rounded-full px-5 py-2 border border-[var(--accent)] text-[var(--accent)] font-semibold text-sm hover:bg-[var(--accent)] hover:text-white transition"
              >
                Sign in
              </Link>

              <Link
                href={`/sign-up?callbackURL=${encodeURIComponent("/gift-vouchers")}`}
                className="rounded-full px-5 py-2 bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--secondary)] transition"
              >
                Create account
              </Link>
            </div>
          </div>
        )}

        {!loading && user && (
          <div className="text-center">
            <p className="text-[var(--foreground)]/80 text-sm mb-4">
              You’re signed in — you can buy a voucher now.
            </p>

            <Link
              href="/gift-vouchers"
              className="rounded-full px-6 py-3 bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--secondary)] transition inline-block"
            >
              Buy a Voucher →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
