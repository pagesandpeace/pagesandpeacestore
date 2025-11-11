// src/components/Footer.tsx
"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="
        h-16      /* ← predictable footer height */
        border-t border-[var(--border)] mt-0
        text-center text-sm font-[Montserrat] text-[var(--foreground)]/80
        flex items-center justify-center
        pb-[env(safe-area-inset-bottom)]  /* iPhone home bar */
      "
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
        <p className="text-[var(--foreground)]/60">
          © {new Date().getFullYear()} Pages & Peace · All rights reserved.
        </p>
        <nav className="flex gap-4 flex-wrap justify-center">
          <Link href="/privacy" className="hover:text-[var(--accent)] transition-colors">Privacy Policy</Link>
          <span className="hidden sm:inline text-[var(--foreground)]/40">·</span>
          <Link href="/cookies" className="hover:text-[var(--accent)] transition-colors">Cookie Policy</Link>
          <span className="hidden sm:inline text-[var(--foreground)]/40">·</span>
          <Link href="/terms" className="hover:text-[var(--accent)] transition-colors">Terms of Service</Link>
        </nav>
      </div>
    </footer>
  );
}
