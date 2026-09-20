"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  CircleUserRound,
  Home,
  Info,
  Mail,
  MapPin,
  Menu,
  Ticket,
  X,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";

const NAV_LINKS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Book Reviews", href: "/book-reviews", icon: BookOpen },
  { label: "Visit", href: "/visit", icon: MapPin },
  { label: "About", href: "/about", icon: Info },
  { label: "Contact", href: "/contact", icon: Mail },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useUser();
  const [eventQty, setEventQty] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const refresh = () => {
      try {
        setEventQty(
          (JSON.parse(window.localStorage.getItem("app_core_event_basket_v1") ?? "[]") as { quantity: number }[])
            .reduce((total, item) => total + item.quantity, 0)
        );
      } catch {
        setEventQty(0);
      }
    };
    refresh();
    window.addEventListener("app-core-basket-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("app-core-basket-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const accountHref = user?.role === "admin" ? "/admin" : "/dashboard/account";

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 shadow-[0_1px_12px_rgba(0,0,0,.04)] backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/5 bg-[#FAF6F1] md:hidden"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className="flex items-center" aria-label="Pages & Peace home">
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

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`text-sm font-medium transition ${active ? "text-[#189458]" : "text-[#24221e] hover:text-[#189458]"}`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/events/checkout"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/5 bg-[#FAF6F1]"
            aria-label={`Ticket basket${eventQty ? `, ${eventQty} ticket${eventQty === 1 ? "" : "s"}` : ""}`}
          >
            <Ticket className="h-5 w-5" />
            {eventQty > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#17221f] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                {eventQty > 99 ? "99+" : eventQty}
              </span>
            ) : null}
          </Link>

          {!loading ? (
            user ? (
              <Link
                href={accountHref}
                className="hidden items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-[#24221e] md:inline-flex"
              >
                <CircleUserRound className="h-4 w-4" />
                My Account
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="hidden rounded-full bg-[#17221f] px-4 py-2 text-sm font-semibold text-white md:inline-flex"
              >
                Sign in
              </Link>
            )
          ) : null}
        </div>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-[70] bg-[#ede7de] md:hidden">
          <div className="flex h-dvh flex-col">
            <div className="safe-top flex items-center justify-between bg-[#FAF6F1] px-5 pb-3 pt-3">
              <Link href="/" onClick={() => setOpen(false)} className="flex items-center">
                <Image src="/p&p_logo_cream.svg" alt="Pages & Peace" width={88} height={54} />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 bg-[#FAF6F1] px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-2">
              <div className="overflow-hidden rounded-[1.6rem] border border-black/8 bg-white shadow-[0_12px_32px_rgba(46,38,31,.08)]">
                <div className="px-5 pb-2 pt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-neutral-500">Explore Pages & Peace</p>
                </div>

                <nav>
                  {NAV_LINKS.map((link) => {
                    const Icon = link.icon;
                    const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={`flex min-h-[3.6rem] items-center gap-3 border-b border-black/6 px-5 py-3 text-[15px] font-semibold transition last:border-b-0 ${active ? "bg-[#eef6f0] text-[#166c43]" : "bg-white text-[#2d2a26]"}`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${active ? "bg-[#dcecdf] text-[#166c43]" : "bg-[#f2eee8] text-[#514b44]"}`}>
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="flex-1">{link.label}</span>
                        <span className="text-lg font-normal text-neutral-300" aria-hidden="true">›</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="border-t border-black/10 bg-[#f8f4ee] p-3">
                  {!loading ? (
                    user ? (
                      <Link
                        href={accountHref}
                        onClick={() => setOpen(false)}
                        className="flex min-h-[3.75rem] items-center gap-3 rounded-2xl bg-[#17221f] px-4 py-3 font-semibold text-white"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                          <CircleUserRound className="h-[18px] w-[18px]" />
                        </span>
                        <span className="flex-1">My Account</span>
                        <span className="text-white/60" aria-hidden="true">→</span>
                      </Link>
                    ) : (
                      <Link
                        href="/sign-in"
                        onClick={() => setOpen(false)}
                        className="flex min-h-[3.75rem] items-center justify-center rounded-2xl bg-[#17221f] px-4 py-3 font-semibold text-white"
                      >
                        Sign in
                      </Link>
                    )
                  ) : (
                    <div className="h-[3.75rem] animate-pulse rounded-2xl bg-neutral-100" />
                  )}
                </div>
              </div>

              <div className="px-3 pt-4 text-center">
                <p className="text-xs leading-5 text-neutral-500">Books, events and a quiet reading community.</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
