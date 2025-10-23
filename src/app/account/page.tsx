// src/app/account/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, signOut } from "@/lib/auth/actions";
import Link from "next/link";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await getCurrentUser();
      setUser(res);
    };
    fetchUser();
  }, []);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF6F1] text-[#111]">
        <p className="text-lg">🔐 Please sign in to view your account.</p>
        <Link
          href="/sign-in"
          className="mt-4 px-6 py-2 rounded-full bg-[#5DA865] text-[#FAF6F1] font-semibold hover:opacity-90"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] flex flex-col items-center py-16 px-6">
      <section className="max-w-xl w-full bg-white/60 backdrop-blur-md rounded-2xl shadow-md p-8">
        <h1 className="text-3xl font-montserrat tracking-widest mb-6 text-center">
          My Account ☕
        </h1>

        <div className="space-y-4 text-lg">
          <div>
            <p className="font-semibold">👤 Name</p>
            <p>{user.name || "Anonymous Reader"}</p>
          </div>
          <div>
            <p className="font-semibold">📧 Email</p>
            <p>{user.email}</p>
          </div>
          <div>
            <p className="font-semibold">📅 Joined</p>
            <p>
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/orders"
            className="px-6 py-2 border border-[#5DA865] text-[#5DA865] rounded-full hover:bg-[#5DA865]/10 transition-all"
          >
            View Orders
          </Link>
          <button
            onClick={async () => {
              await signOut();
              window.location.href = "/";
            }}
            className="px-6 py-2 bg-[#5DA865] text-[#FAF6F1] rounded-full font-semibold hover:opacity-90 transition-all"
          >
            Sign Out
          </button>
        </div>
      </section>
    </main>
  );
}
