// src/app/(marketing)/layout.tsx
"use client";

import { useEffect, useState } from "react";
import LoyaltyJoinModal from "@/components/LoyaltyJoinModal";
import Navbar from "@/components/Navbar";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [banner, setBanner] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount, check membership to set the banner copy
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) {
          setJoined(false);
          setBanner("🌿 Join the Pages & Peace Loyalty Club and earn points!");
          return;
        }
        const me = await res.json();
        if (me?.loyaltyprogram) {
          setJoined(true);
          setBanner("✅ You’re in the Pages & Peace Loyalty Club!");
        } else {
          setJoined(false);
          setBanner("🌿 Join the Pages & Peace Loyalty Club and earn points!");
        }
      } catch (err) {
        console.error("[MarketingLayout] /api/me failed:", err);
        setJoined(false);
        setBanner("🌿 Join the Pages & Peace Loyalty Club and earn points!");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Open modal unconditionally; let the modal handle auth (redirect on 401)
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

      {/* Navbar sits directly under the banner; no extra padding/margin here */}
      <Navbar />

      {/* Only page content scrolls; footer remains visible via RootLayout */}
      <main className="flex-1 min-h-0 overflow-y-auto">
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
