// src/app/(marketing)/(auth)/layout.tsx  (adjust path to your auth segment)
"use client";

import Image from "next/image";
import LockScroll from "@/components/LockScroll";
import BackLink from "@/components/BackLink";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="
        relative flex flex-col lg:flex-row
        min-h-screen h-[100svh] w-full
        bg-[var(--background)] text-[var(--foreground)]
        overflow-hidden
      "
    >
      {/* 🔒 Lock body scroll on all auth screens */}
      <LockScroll />

      {/* LEFT SECTION — Brand Message (desktop) */}
      <section
        className="
          hidden lg:flex
          flex-col justify-between
          bg-[#111111] text-[#FAF6F1]
          p-12
          w-1/2
        "
      >
        {/* Logo */}
        <div className="flex justify-start">
          <Image
            src="/p&p_logo_cream_transparent.svg"
            alt="Pages & Peace logo cream"
            width={130}
            height={130}
            priority
            className="object-contain"
          />
        </div>

        {/* Brand Message */}
        <div className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-wide leading-snug">
            Every community needs a chapter 📚
          </h2>
          <p className="text-[#eae6e1] text-base leading-relaxed max-w-md">
            Sign in or create your account to continue your story ☕
          </p>
        </div>

        {/* Footer */}
        <p className="text-sm text-[#d8d3cd]">
          © {new Date().getFullYear()} Pages & Peace. All rights reserved.
        </p>
      </section>

      {/* RIGHT SECTION — Form Area */}
      <section
        className="
          relative flex flex-1 items-center justify-center
          bg-[#FAF6F1] text-[#111111]
          px-6 sm:px-10 md:px-12
          py-12 sm:py-20
          overflow-hidden    /* ⛔ no scrolling on auth pages */
          h-[100svh]         /* fill viewport height */
        "
      >
        {/* ⬅️ Back link (top-left, like an app) */}
        <div className="absolute left-4 top-4 z-10">
          <BackLink />
        </div>

        <div
          className="
            w-full max-w-md
            bg-white/40 backdrop-blur-sm
            rounded-xl
            shadow-[0_4px_20px_rgba(0,0,0,0.05)]
            p-8 sm:p-10
            border border-[#e8e2da]
          "
        >
          {children}
        </div>
      </section>
    </main>
  );
}
