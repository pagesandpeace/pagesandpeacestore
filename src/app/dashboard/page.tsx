"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/actions";

type User = {
  id: string;
  name: string | null;
  email: string;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const data = await getCurrentUser();
      setUser(data);
    };
    loadUser();
  }, []);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat]">
        <p className="text-lg">🔐 Please sign in to view your dashboard.</p>
        <Link
          href="/sign-in"
          className="mt-4 px-6 py-2 rounded-full bg-[#5DA865] text-[#FAF6F1] font-semibold hover:opacity-90 transition-all"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] px-6 py-12 font-[Montserrat]">
      {/* ---- Header ---- */}
      <header className="mb-12">
        <h1 className="text-3xl font-semibold tracking-widest mb-2">
          Welcome back, {user.name || "Reader"} ☕
        </h1>
        <p className="text-[#111]/70 text-sm max-w-xl">
          Here’s what’s happening in your Pages & Peace account.
        </p>
      </header>

      {/* ---- Dashboard Overview ---- */}
      <section className="space-y-10 max-w-3xl">
        {/* Recent Orders Summary */}
        <div className="pb-6 border-b border-[#dcd6cf] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#777] font-medium mb-2">
              Recent Orders
            </p>
            <p className="text-sm text-[#555] max-w-sm">
              Track your latest purchases and see their current status.
            </p>
          </div>
          <Link
            href="/dashboard/orders"
            className="inline-block px-6 py-3 rounded-full border border-[#5DA865] text-[#5DA865] font-semibold text-sm hover:bg-[#5DA865]/10 transition-all"
          >
            View Orders →
          </Link>
        </div>

        {/* Account Settings Shortcut */}
        <div className="pb-6 border-b border-[#dcd6cf] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#777] font-medium mb-2">
              Account Settings
            </p>
            <p className="text-sm text-[#555] max-w-sm">
              Update your personal details or change your password anytime.
            </p>
          </div>
          <Link
            href="/dashboard/account/security"
            className="inline-block px-6 py-3 rounded-full border border-[#5DA865] text-[#5DA865] font-semibold text-sm hover:bg-[#5DA865]/10 transition-all"
          >
            Manage Account →
          </Link>
        </div>

        {/* Preferences / Book Club Shortcut */}
        <div className="pb-6 border-b border-[#dcd6cf] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#777] font-medium mb-2">
              Community & Preferences
            </p>
            <p className="text-sm text-[#555] max-w-sm">
              Join book clubs, follow new releases, or adjust your reading preferences.
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="inline-block px-6 py-3 rounded-full border border-[#5DA865] text-[#5DA865] font-semibold text-sm hover:bg-[#5DA865]/10 transition-all"
          >
            Go to Settings →
          </Link>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="text-center text-[#111]/50 text-xs mt-20">
        © {new Date().getFullYear()} Pages & Peace · Crafted with ☕ & 📚
      </footer>
    </main>
  );
}
