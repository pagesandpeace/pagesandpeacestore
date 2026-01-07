"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const pathname = usePathname();

  const isAdmin = pathname.startsWith("/admin");
  const isDashboard = pathname.startsWith("/dashboard");

  /* -----------------------------
     ADMIN FOOTER (MINIMAL)
  ----------------------------- */
  if (isAdmin) {
    return (
      <footer className="w-full border-t border-[#e5e2dc] bg-[var(--background)]">
        <p className="py-4 text-center text-xs text-[var(--foreground)]/50 font-[Montserrat]">
          © {new Date().getFullYear()} Pages & Peace · Admin
        </p>
      </footer>
    );
  }

  /* -----------------------------
     PUBLIC + DASHBOARD FOOTER
  ----------------------------- */
  return (
    <footer
      className={`
        bg-[var(--background)]
        border-t border-[#e5e2dc]
        font-[Montserrat]
        w-full
        overflow-hidden
        ${isDashboard ? "md:ml-64 md:w-[calc(100%-16rem)]" : ""}
      `}
    >
      <div className="flex flex-col items-center px-6 md:px-10 py-16 text-sm text-[var(--foreground)]/70">
        
        {/* LOGO */}
        <Image
          src="/p&p_logo_black_transparent.svg"
          alt="Pages & Peace"
          width={70}
          height={50}
        />

        {/* TAGLINE */}
        <p className="mt-4 text-center max-w-md leading-relaxed">
          Books, coffee & calm.
          <br />
          A community space for slow moments and thoughtful conversations.
        </p>

        {/* SOCIALS */}
        <div className="flex items-center gap-5 mt-6">
          <a
            href="https://www.instagram.com/pagesandpeace_cafe/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/instagram.svg"
              alt="Instagram"
              width={20}
              height={20}
              className="opacity-70 hover:opacity-100 transition"
            />
          </a>

          <a
            href="https://www.facebook.com/profile.php?id=61581624222575"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/facebook.svg"
              alt="Facebook"
              width={20}
              height={20}
              className="opacity-70 hover:opacity-100 transition"
            />
          </a>
        </div>

        {/* INFORMATION LINKS */}
<div className="mt-10 flex flex-col items-center gap-3 text-sm">
  <Link href="/privacy" className="hover:text-[var(--foreground)]">
    Privacy Policy
  </Link>

  <Link href="/cookies" className="hover:text-[var(--foreground)]">
    Cookie Policy
  </Link>

  <Link href="/terms" className="hover:text-[var(--foreground)]">
    Terms of Service
  </Link>

  <Link
    href="/legal/event-booking-terms"
    className="hover:text-[var(--foreground)]"
  >
    Event Booking Terms
  </Link>
</div>




        {/* COPYRIGHT */}
        <p className="mt-8 text-xs text-center text-[var(--foreground)]/50">
          © {new Date().getFullYear()} Pages & Peace · All rights reserved.
        </p>
      </div>
    </footer>
  );
}
