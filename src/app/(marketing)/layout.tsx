"use client";

import { useCart } from "@/context/CartContext";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { cart } = useCart();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const [banner, setBanner] = useState("🌿 10% off all coffee blends this weekend!");

  return (
    <div className="min-h-screen flex flex-col">
      {/* ---- Marketing Banner ---- */}
      {banner && (
        <div className="bg-[var(--accent)] text-[var(--background)] text-center py-2 font-semibold text-sm">
          {banner}
        </div>
      )}

      {/* ---- Header ---- */}
      <header className="flex justify-between items-center px-6 py-4 bg-[var(--background)] shadow-sm sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/p&p_logo_cream.svg" alt="Pages & Peace" width={40} height={40} />
          <span className="font-montserrat font-bold text-lg text-[var(--foreground)]">
            Pages & Peace
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/" className="text-[var(--foreground)] hover:text-[var(--accent)]">Home</Link>
          <Link href="/shop" className="text-[var(--foreground)] hover:text-[var(--accent)]">Shop</Link>
          <Link href="/about" className="text-[var(--foreground)] hover:text-[var(--accent)]">About</Link>
          <Link href="/contact" className="text-[var(--foreground)] hover:text-[var(--accent)]">Contact</Link>

          {/* ---- Cart Icon ---- */}
          <Link href="/cart" className="relative">
            <span className="text-2xl">🛒</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-3 bg-[var(--accent)] text-[var(--background)] rounded-full text-xs w-5 h-5 flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </Link>
        </nav>
      </header>

      {/* ---- Page Content ---- */}
      <main className="flex-1">{children}</main>

      {/* ---- Footer (optional placeholder) ---- */}
      <footer className="bg-[var(--background)] text-center py-6 text-sm text-[var(--foreground)]/70 border-t">
        © {new Date().getFullYear()} Pages & Peace · Books, coffee & calm ☕📚
      </footer>
    </div>
  );
}
