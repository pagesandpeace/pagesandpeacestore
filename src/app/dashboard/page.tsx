"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/actions";
import LoyaltyJoinModal from "@/components/LoyaltyJoinModal";

type User = { id: string; name: string | null; email: string };
type Me = { id: string; email: string; loyaltyprogram?: boolean };

const DISMISS_KEY = "pp_alpha_banner_dismissed_v2";
const DISMISS_TTL_HOURS = 24;

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // ✅ prevent sign-in flash
  const [loyalty, setLoyalty] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(true);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Load current user with a loading gate
  useEffect(() => {
    (async () => {
      try {
        const data = await getCurrentUser();
        setUser(data);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // Check loyalty via /api/me
  async function refreshMe() {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.ok) {
        const me: Me = await res.json();
        setLoyalty(Boolean(me.loyaltyprogram));
      }
    } catch {}
  }
  useEffect(() => {
    refreshMe();
  }, []);

  // Respect banner dismissal with TTL
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return;
      const { ts } = JSON.parse(raw) as { ts: number };
      const ageMs = Date.now() - ts;
      if (ageMs < DISMISS_TTL_HOURS * 3600 * 1000) setShowBanner(false);
    } catch {}
  }, []);

  const dismissBanner = () => {
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ ts: Date.now() }));
    } catch {}
    setShowBanner(false);
  };

  const openJoinModal = () => setShowJoinModal(true);

  const handleJoinedSuccess = async () => {
    await refreshMe();
    setShowJoinModal(false);
    // tell Sidebar to re-fetch /api/me and show the badge
    window.dispatchEvent(new Event("pp:loyalty-updated"));
    setShowBanner(true); // optional
  };

  // ✅ show a neutral loader while auth resolves (no sign-in flash)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[Montserrat] flex items-center justify-center">
        <p className="text-sm text-[var(--foreground)]/70">Loading your dashboard…</p>
      </div>
    );
  }

  // If truly not signed in after loading
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[Montserrat]">
        <p className="text-lg">🔐 Please sign in to view your dashboard.</p>
        <Link
          href="/sign-in"
          className="mt-4 px-6 py-2 rounded-full text-[var(--accent)] border-2 border-[var(--accent)] font-semibold hover:text-[var(--secondary)] hover:border-[var(--secondary)] transition-all"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[var(--background)] text-[var(--foreground)] font-[Montserrat]">
      {/* Early Access banner */}
      {showBanner && (
        <div role="status" className="w-full bg-[#FFF6E5] text-[#5B4200] border-b border-[#EAD9B5]">
          <div className="mx-auto max-w-4xl px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-relaxed">
              <span className="mr-2 inline-flex items-center rounded-full bg-[#F1C40F] text-[#111] px-2 py-[2px] text-[11px] font-semibold uppercase tracking-wide">
                Early Access
              </span>
              {loyalty ? (
                <>
                  Thanks for being an early adopter via the <strong>Chapters Club</strong>. Features are rolling out - some areas are preview-only for now.
                </>
              ) : (
                <>We’re still in early development. Some sections are preview-only and will go live soon.</>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Link href="/dashboard/orders" className="text-sm font-medium underline underline-offset-4 hover:opacity-80">
                What’s coming
              </Link>

              {!loyalty && (
                <button
                  type="button"
                  onClick={openJoinModal}
                  className="
                    inline-flex items-center justify-center
                    px-4 py-1.5 text-sm font-semibold
                    rounded-full
                    text-[var(--accent)] border-2 border-[var(--accent)]
                    hover:text-[var(--secondary)] hover:border-[var(--secondary)]
                    transition-all
                    whitespace-nowrap leading-none
                    md:px-5 md:text-base
                  "
                >
                  Join Chapters Club
                </button>
              )}

              <button
                type="button"
                aria-label="Dismiss early access notice"
                onClick={dismissBanner}
                className="rounded-full border border-[#EAD9B5] px-3 py-1 text-sm hover:bg-white/60"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-semibold tracking-widest">
              Welcome back, {user.name || "Reader"} ☕
            </h1>
            <span className="inline-flex items-center rounded-full border border-[#dcd6cf] px-2.5 py-1 text-xs font-semibold text-[#5B4200] bg-[#FFF6E5]">
              Early Access
            </span>
            {/* Loyalty chip removed here; it lives in Sidebar only */}
          </div>
          <p className="text-[var(--foreground)]/70 text-sm max-w-xl mt-2">
            Here’s what’s happening in your Pages & Peace account.
          </p>
        </header>

        {/* Sections */}
        <section className="space-y-10">
          {/* Orders */}
          <div className="pb-6 border-b border-[#dcd6cf] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#777] font-medium mb-2">Recent Orders</p>
              <p className="text-sm text-[#555] max-w-sm">Track your latest purchases and see their current status.</p>
            </div>
            <Link
              href="/dashboard/orders"
              className="inline-block px-6 py-3 rounded-full border-2 border-[var(--accent)] text-[var(--accent)] font-semibold text-sm transition-all hover:border-[var(--secondary)] hover:text-[var(--secondary)] hover:bg-[var(--secondary)]/10 whitespace-nowrap"
            >
              View Orders →
            </Link>
          </div>

          {/* Account */}
          <div className="pb-6 border-b border-[#dcd6cf] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#777] font-medium mb-2">Account Settings</p>
              <p className="text-sm text-[#555] max-w-sm">Update your personal details or change your password anytime.</p>
            </div>
            <Link
              href="/dashboard/account"
              className="inline-block px-6 py-3 rounded-full border-2 border-[var(--accent)] text-[var(--accent)] font-semibold text-sm transition-all hover:border-[var(--secondary)] hover:text-[var(--secondary)] hover:bg-[var(--secondary)]/10 whitespace-nowrap"
            >
              Manage Account →
            </Link>
          </div>

          {/* Preferences / Community */}
          <div className="pb-6 border-b border-[#dcd6cf] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#777] font-medium mb-2">Community & Preferences</p>
              <p className="text-sm text-[#555] max-w-sm">Join book clubs, follow new releases, or adjust your reading preferences.</p>
            </div>
            <Link
              href="/dashboard/settings"
              className="inline-block px-6 py-3 rounded-full border-2 border-[var(--accent)] text-[var(--accent)] font-semibold text-sm transition-all hover:border-[var(--secondary)] hover:text-[var(--secondary)] hover:bg-[var(--secondary)]/10 whitespace-nowrap"
            >
              Go to Settings →
            </Link>
          </div>
        </section>
      </div>

      {/* In-dashboard join modal (authed flow) */}
      {showJoinModal && (
        <LoyaltyJoinModal onClose={() => setShowJoinModal(false)} onSuccess={handleJoinedSuccess} />
      )}
    </div>
  );
}
