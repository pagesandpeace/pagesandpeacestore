"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/hooks/useUser";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useUser();
  const { cart } = useCart();
  const [eventQty, setEventQty] = useState(0);
  useEffect(() => {
    const refresh = () => {
      try { setEventQty((JSON.parse(window.localStorage.getItem("app_core_event_basket_v1") ?? "[]") as { quantity: number }[]).reduce((total, item) => total + item.quantity, 0)); } catch { setEventQty(0); }
    };
    refresh(); window.addEventListener("app-core-basket-changed", refresh); window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("app-core-basket-changed", refresh); window.removeEventListener("storage", refresh); };
  }, []);
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0) + eventQty;

  const toggleMenu = () => setOpen(!open);
  const closeMenu = () => setOpen(false);

  // ✅ ROLE-AWARE ACCOUNT DESTINATION
  const accountHref =
    user?.role === "admin" ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* MOBILE ICON */}
        <button onClick={toggleMenu} className="p-2 md:hidden">
          {open ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>

        {/* LOGO */}
        <Link href="/" className="flex items-center">
          <Image
            src="/p&p_logo_cream.svg"
            alt="Pages & Peace"
            width={0}
            height={0}
            sizes="64px"
            priority
            className="block h-10 w-auto"
          />
        </Link>

        {/* CART + ACCOUNT */}
        <div className="flex items-center gap-4">
          <Link href="/events/checkout" className="relative">
            <span className="text-lg">🛒</span>
            {totalQty > 0 && (
              <span className="absolute -top-1 -right-3 w-5 h-5 text-xs bg-[var(--accent)] rounded-full flex items-center justify-center">
                {totalQty}
              </span>
            )}
          </Link>

          {/* ACCOUNT (DESKTOP) */}
          {!loading && (
            user ? (
              <Link href={accountHref} className="hidden md:inline-block">
                My Account
              </Link>
            ) : (
              <Link href="/sign-in" className="hidden md:inline-block">
                Sign In
              </Link>
            )
          )}
        </div>

        {/* DESKTOP NAV */}
        <ul className="hidden md:flex gap-8 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-gray-500">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* MOBILE MENU */}
      {open && (
        <>
          {/* BACKDROP */}
          <button
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={closeMenu}
            aria-label="Close menu"
          />

          {/* MENU PANEL */}
          <div className="relative z-50 bg-[var(--accent)] rounded-b-xl shadow-lg md:hidden p-4">
            <ul className="space-y-1">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={closeMenu}
                    className="block px-3 py-2"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}

              {/* ACCOUNT (MOBILE) */}
              {!loading && (
                user ? (
                  <Link
                    href={accountHref}
                    onClick={closeMenu}
                    className="block px-3 py-2"
                  >
                    My Account
                  </Link>
                ) : (
                  <Link
                    href="/sign-in"
                    onClick={closeMenu}
                    className="block px-3 py-2"
                  >
                    Sign In
                  </Link>
                )
              )}
            </ul>
          </div>
        </>
      )}
    </header>
  );
}
