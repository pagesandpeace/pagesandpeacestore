"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function Footer() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  /* -------------------------------
     Close dropdown on outside click
  -------------------------------- */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <footer
      className="
        border-t border-[var(--border)]
        text-center text-sm font-[Montserrat]
        text-[var(--foreground)]/80
        pt-10 
        pb-36    /* MUCH more bottom spacing */
        pb-[env(safe-area-inset-bottom)]
        relative
      "
    >
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-6 px-4">

        {/* COPYRIGHT */}
        <p className="text-[var(--foreground)]/60">
          © {new Date().getFullYear()} Pages & Peace · All rights reserved.
        </p>

        {/* LEGAL DROPDOWN */}
        <div className="relative flex justify-center" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="
              flex items-center gap-2
              px-6 py-3
              rounded-full
              bg-[#189458]
              text-white
              border border-[#157c46]
              shadow-sm
              hover:bg-[#157c46]
              transition-all duration-200
              text-base font-semibold
            "
          >
            Legal
            <span
              className={`transition-transform ${
                open ? "rotate-180" : "rotate-0"
              }`}
            >
              ▲
            </span>
          </button>

          {/* DROPDOWN — POPS UPWARD */}
          {open && (
            <>
              {/* BACKDROP FOR CLICK OUTSIDE */}
              <div className="fixed inset-0 z-40" />

              <div
                className="
                  absolute left-1/2 -translate-x-1/2 bottom-[110%]
                  bg-white shadow-xl border border-[var(--border)]
                  rounded-xl py-4 w-64 z-50
                  animate-fadeIn
                "
              >
                {/* CLOSE BUTTON */}
                <button
                  onClick={() => setOpen(false)}
                  className="
                    w-full text-right pr-4 pb-2 text-[var(--foreground)]/70
                    hover:text-[var(--accent)] text-sm
                  "
                >
                  ✕ Close
                </button>

                <div className="flex flex-col px-5 gap-3 text-[var(--foreground)]">

                  <Link
                    href="/privacy"
                    className="hover:text-[var(--accent)] transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    Privacy Policy
                  </Link>

                  <Link
                    href="/cookies"
                    className="hover:text-[var(--accent)] transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    Cookie Policy
                  </Link>

                  <Link
                    href="/terms"
                    className="hover:text-[var(--accent)] transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    Terms of Service
                  </Link>

                  <Link
                    href="/legal/event-booking-terms"
                    className="hover:text-[var(--accent)] transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    Event Booking Terms
                  </Link>

                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
