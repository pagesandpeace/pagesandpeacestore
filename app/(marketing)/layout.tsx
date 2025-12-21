"use client";

import { useEffect, useState } from "react";
import LoyaltyJoinModal from "@/components/LoyaltyJoinModal";
import Navbar from "@/components/Navbar";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [banner, setBanner] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ----------------------------------------------------
     LOYALTY STATUS CHECK (SINGLE SOURCE OF TRUTH)
  ---------------------------------------------------- */
  useEffect(() => {
  async function load() {
    try {
      const res = await fetch("/api/loyalty/me", {
        cache: "no-store",
        credentials: "include",
      });

      const data = await res.json();
      const isMember = Boolean(data?.member);

      if (isMember) {
        setJoined(true);
        setBanner(null); // ← NEVER show banner for members
      } else {
        setJoined(false);
        setBanner("🌿 Join the Pages & Peace Loyalty Club and earn points!");
      }
    } catch (err) {
      console.warn("[MarketingLayout] Loyalty check failed:", err);
      setJoined(false);
      setBanner("🌿 Join the Pages & Peace Loyalty Club and earn points!");
    } finally {
      setLoading(false);
    }
  }

  load();
}, []);


  const handleJoinClick = () => setShowModal(true);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[var(--background)]">
      {!loading && banner && (
        <div className="w-full bg-[var(--accent)] text-[var(--background)] text-center py-2 px-4 font-semibold text-sm flex justify-center items-center gap-4 flex-wrap">
          <span>{banner}</span>

          {!joined && (
            <button
              onClick={handleJoinClick}
              className="bg-[var(--background)] text-[var(--accent)] px-4 py-1.5 rounded-full font-semibold border-2 border-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--background)] transition-all"
            >
              Join Now
            </button>
          )}
        </div>
      )}

      <Navbar />

      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>

      {showModal && (
        <LoyaltyJoinModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            localStorage.setItem("pp:loyalty-confirmed", "true");
            setJoined(true);
            setBanner(null); // hide immediately after success
            setShowModal(false);

            // Optional: let other UI refresh later
            window.dispatchEvent(new Event("pp:loyalty-updated"));
          }}
        />
      )}
    </div>
  );
}
