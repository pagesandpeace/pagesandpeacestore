"use client";

import { useState } from "react";
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
    setOpen((prev) => !prev);
    if (toggleSidebar) toggleSidebar();
  };
  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 pt-2 pb-2"
        aria-label="Primary"
      >
        {/* Left: Hamburger (mobile) */}
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
            width={70}
            height={70}
            priority
            className="object-contain"
          />
        </Link>

        {/* Right: Cart icon (ALWAYS visible) */}
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
          {NAV_LINKS.map((link) => (
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

      {/* Separator */}
      <div className="border-t border-gray-200 mt-2" />

      {/* Mobile dropdown with outside-click close */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          aria-hidden="true"
          onClick={closeMenu} // click outside closes
        >
          {/* Overlay to capture outside clicks (transparent) */}
          <div className="absolute inset-0" />

          {/* Solid dropdown panel (auto height, not full screen) */}
          <div
            id="mobile-menu"
            className="absolute top-16 left-0 w-full bg-white border-t border-gray-200 shadow-lg"
            onClick={(e) => e.stopPropagation()} // don't close when clicking inside
          >
            <ul className="space-y-2 px-4 py-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block py-2 text-gray-800 hover:text-gray-600"
                    onClick={closeMenu}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {/* Cart NOT duplicated here to avoid redundancy */}
            </ul>
          </div>
        </div>
      )}
    </header>
  );
}
