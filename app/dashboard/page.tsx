"use client";

import Link from "next/link";
import { useUser } from "@/hooks/useUser";

export default function DashboardPage() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="opacity-60">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-lg">Please sign in to view your dashboard.</p>
        <Link
          href="/sign-in"
          className="mt-4 px-6 py-2 rounded-full border-2 border-accent text-accent"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-background text-foreground font-[Montserrat]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <header className="mb-12">
          <h1 className="text-3xl font-semibold">
            Welcome back, {user.name || "Reader"} ☕
          </h1>
        </header>

        {/* Orders */}
        <section className="pb-6 border-b">
          <div>
            <p className="text-xs uppercase tracking-wide">Recent Orders</p>
            <p className="text-sm text-[#555] max-w-sm">
              Track your latest purchases and their status.
            </p>
          </div>

          <Link href="/dashboard/orders" className="inline-block px-6 py-3 rounded-full border-2 border-accent text-accent">
            View Orders →
          </Link>
        </section>

        {/* Account */}
        <section className="py-6 border-b">
          <p className="text-xs uppercase tracking-wide">Account</p>
          <p className="text-sm max-w-sm text-[#555]">Update your personal information.</p>

          <Link href="/dashboard/account" className="inline-block px-6 py-3 rounded-full border-2 border-accent text-accent">
            Manage Account →
          </Link>
        </section>

        {/* Settings */}
        <section className="py-6">
          <p className="text-xs uppercase tracking-wide">Preferences</p>
          <p className="text-sm max-w-sm text-[#555]">Adjust settings and preferences.</p>

          <Link href="/dashboard/settings" className="inline-block px-6 py-3 rounded-full border-2 border-accent text-accent">
            Go to Settings →
          </Link>
        </section>
      </div>
    </div>
  );
}
