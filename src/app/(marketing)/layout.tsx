"use client";

import { useEffect, useState } from "react";
import LoyaltyJoinModal from "@/components/LoyaltyJoinModal";
import Navbar from "@/components/Navbar";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [banner, setBanner] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkLoyalty() {
      try {
        const res = await fetch("/api/loyalty/status");
        if (res.ok) {
          const data = await res.json();
          if (data?.loyaltyprogram) {
            setJoined(true);
            setBanner("✅ You’re in the Pages & Peace Loyalty Club!");
          } else {
            setBanner("🌿 Join the Pages & Peace Loyalty Club and earn points!");
          }
        } else if (res.status === 401) {
          setBanner("🌿 Join the Pages & Peace Loyalty Club and earn points!");
        } else {
          setBanner("🌿 Join the Pages & Peace Loyalty Club and earn points!");
        }
      } catch (err) {
        console.error("Error checking loyalty:", err);
        setBanner("🌿 Join the Pages & Peace Loyalty Club and earn points!");
      } finally {
        setLoading(false);
      }
    }
    checkLoyalty();
  }, []);

  const handleJoinClick = async () => {
    try {
      const res = await fetch("/api/loyalty/status");
      if (res.status === 401) {
        window.location.href = "/sign-up?join=loyalty";
        return;
      }
      setShowModal(true);
    } catch (err) {
      console.error("Join flow error:", err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
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

      {/* Navbar (no sidebar controls needed here) */}
      <div className="pt-4 pb-0">
        <Navbar />
      </div>

      <main className="flex-1 pt-4 md:pt-16 pb-16">
        {children}
      </main>

      {showModal && (
        <LoyaltyJoinModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setJoined(true);
            setBanner("✅ You’re in the Pages & Peace Loyalty Club!");
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
