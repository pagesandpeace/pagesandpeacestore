"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoyaltyJoinModal from "@/components/LoyaltyJoinModal";
import { useUser } from "@/lib/auth/useUser";

type Me = { id: string; email: string; loyaltyprogram?: boolean };

export default function DashboardPage() {
  const { user, loading } = useUser();

  /* -------------------------------------------------------
     LOYALTY (NO FLICKER)
  ------------------------------------------------------- */
  const [loyalty, setLoyalty] = useState<boolean | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoyalty(false);
      return;
    }

    async function loadLoyalty() {
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (res.ok) {
          const me: Me = await res.json();
          setLoyalty(Boolean(me.loyaltyprogram));
        } else {
          setLoyalty(false);
        }
      } catch {
        setLoyalty(false);
      }
    }

    loadLoyalty();
  }, [user]);

  /* -------------------------------------------------------
     BLOCK RENDER UNTIL READY
  ------------------------------------------------------- */
  if (loading || loyalty === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-[Montserrat]">
        <p className="opacity-60 text-sm">Loading your dashboard…</p>
      </div>
    );
  }

  /* -------------------------------------------------------
     NOT LOGGED IN
  ------------------------------------------------------- */
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background font-[Montserrat]">
        <p className="text-lg">🔐 Please sign in to view your dashboard.</p>
        <Link
          href="/sign-in"
          className="mt-4 px-6 py-2 rounded-full text-accent border-2 border-accent font-semibold hover:text-secondary hover:border-secondary transition-all"
        >
          Sign In
        </Link>
      </div>
    );
  }

  /* -------------------------------------------------------
     HANDLER: Join success -> reload loyalty flag
  ------------------------------------------------------- */
  const handleJoinedSuccess = async () => {
    try {
      const res = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const me: Me = await res.json();
        setLoyalty(Boolean(me.loyaltyprogram));
      }
    } catch {}

    setShowJoinModal(false);
    window.dispatchEvent(new Event("pp:loyalty-updated"));
  };

  /* -------------------------------------------------------
     MAIN DASHBOARD CONTENT (NO EARLY ACCESS ANYWHERE)
  ------------------------------------------------------- */
  return (
    <div className="flex-1 w-full bg-background text-foreground font-[Montserrat]">

      {/* ---------------------------------------------------
         MAIN CONTENT
      --------------------------------------------------- */}
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">

        <header className="mb-12">
          <div className="flex items-center gap-3 flex-wrap">

            <h1 className="text-3xl font-semibold tracking-widest">
              Welcome back, {user.name || "Reader"} ☕
            </h1>

            {/* ONLY BADGE LEFT: FOUNDING MEMBER */}
            {loyalty && (
              <span className="inline-flex items-center rounded-full bg-[#E5F7E4] border border-[#5DA865]/30 px-2.5 py-1 text-xs font-semibold text-[#2f6b3a]">
                <strong>Founding Member Status</strong> 🎉
              </span>
            )}
          </div>

          <p className="text-foreground/70 text-sm max-w-xl mt-2">
            Here’s what’s happening in your Pages & Peace account.
          </p>
        </header>

        <section className="space-y-10">

          {/* --------------------- ORDERS --------------------- */}
          <div className="pb-6 border-b border-[#dcd6cf] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#777] font-medium mb-2">Recent Orders</p>
              <p className="text-sm text-[#555] max-w-sm">
                Track your latest purchases and see their current status.
              </p>
            </div>
            <Link
              href="/dashboard/orders"
              className="inline-block px-6 py-3 rounded-full border-2 border-accent text-accent font-semibold text-sm hover:border-secondary hover:text-secondary hover:bg-secondary/10 transition-all whitespace-nowrap"
            >
              View Orders →
            </Link>
          </div>

          {/* -------------------- ACCOUNT --------------------- */}
          <div className="pb-6 border-b border-[#dcd6cf] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#777] font-medium mb-2">Account Settings</p>
              <p className="text-sm text-[#555] max-w-sm">
                Update your personal details or change your password anytime.
              </p>
            </div>
            <Link
              href="/dashboard/account"
              className="inline-block px-6 py-3 rounded-full border-2 text-accent border-accent hover:border-secondary hover:text-secondary hover:bg-secondary/10 transition-all font-semibold text-sm whitespace-nowrap"
            >
              Manage Account →
            </Link>
          </div>

          {/* ------------------ PREFERENCES ------------------- */}
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
              className="inline-block px-6 py-3 rounded-full border-2 text-accent border-accent hover:border-secondary hover:text-secondary hover:bg-secondary/10 transition-all font-semibold text-sm whitespace-nowrap"
            >
              Go to Settings →
            </Link>
          </div>

        </section>
      </div>

      {/* Loyalty Join Modal */}
      {showJoinModal && (
        <LoyaltyJoinModal
          onClose={() => setShowJoinModal(false)}
          onSuccess={handleJoinedSuccess}
        />
      )}
    </div>
  );
}
