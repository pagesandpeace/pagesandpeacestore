"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

// Client user fetch
import { getCurrentUserClient } from "@/lib/auth/client";

type User = { id: string; name?: string | null; email: string } | null;

export default function GiftVoucherDetailsPage() {
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUserClient();
      setUser(u ?? null);
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
        </p>

        <div className="mt-6 text-sm text-[var(--foreground)]/60">
          Valid for 24 months • Usable across multiple visits • Works in both coffee & book store
        </div>
      </section>

      <section className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-md border border-[var(--accent)]/20 text-center">

        <button
          disabled
          className="rounded-full px-6 py-3 bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/40 font-semibold text-sm cursor-not-allowed"
        >
          🕒 Coming Soon
        </button>

        <p className="text-xs text-[var(--foreground)]/60 mt-4">
          Gift vouchers will be available when we launch live payments.
        </p>
      </section>
    </main>
  );
}
