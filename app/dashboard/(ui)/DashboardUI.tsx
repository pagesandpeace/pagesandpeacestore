"use client";

import { useState, useEffect, startTransition, Suspense } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Bars3Icon, TicketIcon } from "@heroicons/react/24/outline";
import type { User } from "@supabase/supabase-js";

type UserProfile = { id: string; auth_user_id: string; email: string | null; name: string | null; image: string | null; role: "admin" | "customer"; };
type DashboardUIProps = { children: React.ReactNode; user: User; profile: UserProfile | null; };
type BasketItem = { ticketTypeId?: string; quantity?: number };
const BASKET_KEY = "app_core_event_basket_v1";

function basketQuantity() {
  try {
    const items = JSON.parse(localStorage.getItem(BASKET_KEY) ?? "[]") as BasketItem[];
    return items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
  } catch {
    return 0;
  }
}

export default function DashboardUI({ children, user, profile }: DashboardUIProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [basketCount, setBasketCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const refreshBasket = () => setBasketCount(basketQuantity());
    refreshBasket();
    window.addEventListener("app-core-basket-changed", refreshBasket);
    window.addEventListener("storage", refreshBasket);
    return () => {
      window.removeEventListener("app-core-basket-changed", refreshBasket);
      window.removeEventListener("storage", refreshBasket);
    };
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    ["/dashboard", "/dashboard/events", "/dashboard/orders", "/dashboard/settings", "/dashboard/account", "/events", "/events/checkout"].forEach((href) => router.prefetch(href));
  }, [sidebarOpen, router]);

  const handleNav = (href: string) => {
    startTransition(() => router.push(href));
    setTimeout(() => setSidebarOpen(false), 30);
  };

  return <div className="flex bg-background min-h-dvh safe-bottom text-foreground">
    <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} handleNav={handleNav} user={user} profile={profile} basketCount={basketCount} />
    <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-white px-4 md:hidden safe-top">
        <button type="button" aria-label="Open menu" className="inline-flex items-center justify-center rounded p-2" onClick={() => setSidebarOpen(true)}><Bars3Icon className="h-6 w-6 text-gray-800" /></button>
        <button type="button" aria-label={`Open ticket basket${basketCount ? `, ${basketCount} ticket${basketCount === 1 ? "" : "s"}` : ""}`} onClick={() => handleNav("/events/checkout")} className="relative inline-flex items-center justify-center rounded p-2">
          <TicketIcon className="h-6 w-6 text-gray-800" />
          {basketCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#17221f] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">{basketCount > 99 ? "99+" : basketCount}</span>}
        </button>
      </header>
      <main className="flex-1 p-4 md:p-8"><Suspense fallback={<div className="opacity-60 text-sm">Loading…</div>}>{children}</Suspense></main>
    </div>
  </div>;
}
