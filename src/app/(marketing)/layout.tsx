"use client";

import { useCart } from "@/context/CartContext";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import LoyaltyJoinModal from "@/components/LoyaltyJoinModal";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { cart } = useCart();
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
    <div className="min-h-screen flex flex-col">
      {/* ---- Loyalty Banner ---- */}
      {!loading && banner && (
        <div className="bg-[var(--accent)] text-[var(--background)] text-center py-2 px-4 font-semibold text-sm flex justify-center items-center gap-4 flex-wrap">
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

      {/* ---- Header ---- */}
      <header className="flex justify-between items-center px-6 py-4 bg-[var(--background)] shadow-sm sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
          <Image
            src="/p&p_logo_cream.svg"
            alt="Pages & Peace"
            width={48}
            height={48}
            className="bg-transparent"
          />
        
        </Link>

        <nav className="flex items-center gap-6 text-sm md:text-base">
          {[
            { href: "/", label: "Home" },
            { href: "/shop", label: "Shop" },
            { href: "/about", label: "About" },
            { href: "/chapters-club", label: "Chapters Club" },
            { href: "/contact", label: "Contact" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[var(--foreground)] hover:text-[var(--secondary)] transition-colors"
            >
              {item.label}
            </Link>
          ))}

          {/* ---- Cart Icon ---- */}
          <Link href="/cart" className="relative hover:text-[var(--secondary)] transition">
            <span className="text-2xl">🛒</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-3 bg-[var(--accent)] text-[var(--background)] rounded-full text-xs w-5 h-5 flex items-center justify-center border-2 border-[var(--background)]">
                {cart.length}
              </span>
            )}
          </Link>
        </nav>
      </header>

      {/* ---- Page Content ---- */}
      <main className="flex-1">{children}</main>

      {/* ---- Loyalty Modal ---- */}
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
