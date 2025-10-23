"use client";

import Link from "next/link";
import Image from "next/image";

export default function VerifySuccess() {
  return (
    <main className="min-h-screen bg-[#FAF6F1] flex flex-col items-center justify-center px-6 py-16 text-center">
      <Image
        src="/p&p_logo_cream.svg"
        alt="Pages & Peace logo"
        width={120}
        height={120}
        className="mb-6"
      />

      <h1 className="font-[Montserrat] text-3xl sm:text-4xl text-[#111111] tracking-widest">
        EMAIL VERIFIED ✅
      </h1>

      <p className="mt-6 text-[#111111]/80 text-lg max-w-md">
        Welcome to Pages & Peace, your story starts here.  
        ☕ You can now sign in and explore our shop, book club, and more.
      </p>

      <Link
        href="/sign-in"
        className="mt-10 px-8 py-3 bg-[#5DA865] text-[#FAF6F1] rounded-full font-semibold text-lg hover:opacity-90 transition-all"
      >
        ✨ Continue to Sign In
      </Link>

      <footer className="mt-16 text-sm text-[#111111]/60">
        © {new Date().getFullYear()} Pages & Peace · Crafted with ☕ & 📚
      </footer>
    </main>
  );
}
