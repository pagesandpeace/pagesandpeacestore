"use client";

import Image from "next/image";
import {
  BookOpen,
  CalendarDays,
  CircleUserRound,
  House,
  LogOut,
  Settings,
  ShoppingBag,
  Ticket,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export type UserProfile = {
  id: string;
  auth_user_id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: "admin" | "customer";
};

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  handleNav: (href: string) => void;
  user: User;
  profile: UserProfile | null;
  basketCount: number;
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: House, exact: true },
  { label: "My events", href: "/dashboard/events", icon: CalendarDays },
  { label: "Order history", href: "/dashboard/orders", icon: ShoppingBag },
  { label: "My reviews", href: "/dashboard/reviews", icon: BookOpen },
];

export default function Sidebar({ sidebarOpen, setSidebarOpen, handleNav, user, profile, basketCount }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (href: string, exact = false) => exact ? pathname === href : pathname.startsWith(href);

  const handleSignOut = async () => {
    await fetch("/auth/signout", { method: "POST" });
    window.dispatchEvent(new Event("pp:auth-updated"));
    router.push("/sign-in");
  };

  return (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close account menu"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,18rem)] flex-col border-r border-[#dcd6cf] bg-[#FAF6F1] shadow-xl transition-transform duration-300 md:w-64 md:translate-x-0 md:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="safe-top flex items-center justify-between px-5 pb-3 pt-4 md:block md:px-6 md:pt-9">
          <button onClick={() => handleNav("/dashboard")} className="flex items-center" aria-label="Account dashboard">
            <Image src="/p&p_logo_cream.svg" alt="Pages & Peace logo" width={92} height={58} />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 md:px-5">
          <p className="mt-3 px-3 text-[11px] font-semibold uppercase tracking-[.18em] text-neutral-500">Your account</p>
          <nav className="mt-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <button
                  key={item.href}
                  onClick={() => handleNav(item.href)}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${active ? "bg-white text-[#166c43] shadow-sm" : "text-[#3d3934] hover:bg-white/70"}`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                </button>
              );
            })}

            <button
              onClick={() => handleNav("/dashboard/reviews/new")}
              className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-xl bg-[#17221f] px-3 py-2.5 text-left text-sm font-semibold text-white"
            >
              <BookOpen className="h-4.5 w-4.5" />
              Review a book
            </button>
          </nav>

          <div className="my-5 border-t border-black/8" />

          <p className="px-3 text-[11px] font-semibold uppercase tracking-[.18em] text-neutral-500">Explore</p>
          <nav className="mt-2 space-y-1">
            <button onClick={() => handleNav("/book-reviews")} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#3d3934] hover:bg-white/70">
              <BookOpen className="h-4.5 w-4.5" />
              Community reviews
            </button>
            <button onClick={() => handleNav("/events")} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#3d3934] hover:bg-white/70">
              <CalendarDays className="h-4.5 w-4.5" />
              Browse events
            </button>
            <button
              onClick={() => handleNav("/events/checkout")}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#3d3934] hover:bg-white/70"
              aria-label={`Ticket basket${basketCount ? `, ${basketCount} ticket${basketCount === 1 ? "" : "s"}` : ""}`}
            >
              <Ticket className="h-4.5 w-4.5" />
              <span>Ticket basket</span>
              {basketCount > 0 ? (
                <span className="ml-auto min-w-5 rounded-full bg-[#17221f] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                  {basketCount > 99 ? "99+" : basketCount}
                </span>
              ) : null}
            </button>
          </nav>
        </div>

        <div className="border-t border-[#ded7cf] bg-white/90 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:p-4">
          <button
            onClick={() => handleNav("/dashboard/account")}
            className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${isActive("/dashboard/account") ? "bg-[#e7f3eb]" : "hover:bg-white"}`}
          >
            <Image
              src={profile?.image ?? "/user_avatar_placeholder.svg"}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border bg-white object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{profile?.name || user.email || "My account"}</p>
              <p className="mt-0.5 text-xs text-neutral-500">View profile</p>
            </div>
            <CircleUserRound className="h-4.5 w-4.5 text-neutral-500" />
          </button>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => handleNav("/dashboard/settings")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border bg-white px-3 text-xs font-semibold">
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button onClick={handleSignOut} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border bg-white px-3 text-xs font-semibold text-red-700">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
