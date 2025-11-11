"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCart } from "@/context/CartContext";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Chapters Club", href: "/chapters-club" },
  { label: "Contact", href: "/contact" },
];

type Props = {
  toggleSidebar?: () => void; // optional
};

export default function Navbar({ toggleSidebar }: Props) {
  const [open, setOpen] = useState(false);
  const { cart } = useCart();
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleToggle = () => {
    setOpen(prev => !prev);
    if (toggleSidebar) toggleSidebar();
  };
  const closeMenu = () => setOpen(false);

  // Close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Primary"
      >
        {/* Left: Hamburger (turns into X when open) */}
        <button
          type="button"
          className="inline-flex items-center justify-center p-2 md:hidden"
          aria-controls="mobile-menu"
          aria-expanded={open ? "true" : "false"}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={handleToggle}
        >
          {open ? (
            <XMarkIcon className="w-6 h-6 text-gray-800" />
          ) : (
            <Bars3Icon className="w-6 h-6 text-gray-800" />
          )}
        </button>

        {/* Center: Logo */}
        <Link href="/" aria-label="Home" className="flex items-center justify-center">
          <Image
            src="/p&p_logo_cream.svg"
            alt="Pages & Peace"
            width={0}
            height={0}
            sizes="64px"
            className="block h-10 w-auto"
            priority
          />
        </Link>

        {/* Right: Cart */}
        <Link
          href="/cart"
          className="relative inline-flex items-center text-gray-800 hover:text-gray-600 transition-colors"
          aria-label="Cart"
        >
          <span className="text-lg">🛒</span>
          {totalQty > 0 && (
            <span
              className="absolute -top-1 -right-3 w-5 h-5 px-1 rounded-full text-xs font-semibold
                         bg-[var(--accent,#5DA865)] text-black flex items-center justify-center"
              aria-label={`${totalQty} items in cart`}
            >
              {totalQty > 99 ? "99+" : totalQty}
            </span>
          )}
          <span className="sr-only">Cart</span>
        </Link>

        {/* Desktop links (centered) */}
        <ul className="hidden items-center gap-8 md:flex absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map(link => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-gray-800 hover:text-gray-600 transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <>
          {/* Backdrop - click to close */}
          <button
            aria-hidden="true"
            className="fixed inset-0 z-40 md:hidden bg-black/30"
            onClick={closeMenu}
          />

          {/* Panel: fixed under navbar, auto-height, green bg */}
          <div
            id="mobile-menu"
            className="
              absolute left-0 right-0 top-16 z-50 md:hidden
              bg-[var(--accent)] text-[var(--background)]
              border-t border-[var(--secondary)]/40 shadow-lg
              rounded-b-xl
            "
            onClick={e => e.stopPropagation()}
          >
            <ul className="px-4 py-3 space-y-1">
              {NAV_LINKS.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="
                      block w-full rounded-lg px-3 py-2
                      text-[var(--background)]
                      hover:bg-[var(--secondary)] hover:text-[var(--background)]
                      transition-colors
                    "
                    onClick={closeMenu}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Thin separator under navbar */}
      <div className="border-t border-gray-200 mt-2" />
    </header>
  );
}
