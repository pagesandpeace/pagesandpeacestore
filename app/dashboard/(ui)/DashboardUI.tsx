"use client";

import { useEffect, useState, startTransition, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Menu, Ticket } from "lucide-react";
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

function pageTitle(pathname: string) {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname.startsWith("/dashboard/account")) return "My Account";
  if (pathname.startsWith("/dashboard/events")) return "My Events";
  if (pathname.startsWith("/dashboard/orders")) return "Order History";
  if (pathname.startsWith("/dashboard/reviews/new")) return "Review a Book";
  if (pathname.startsWith("/dashboard/reviews")) return "My Reviews";
  if (pathname.startsWith("/dashboard/settings")) return "Settings";
  return "My Account";
}

export default function DashboardUI({ children, user, profile }: DashboardUIProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [basketCount, setBasketCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

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
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    ["/dashboard", "/dashboard/events", "/dashboard/orders", "/dashboard/settings", "/dashboard/account", "/dashboard/reviews", "/dashboard/reviews/new", "/book-reviews", "/events", "/events/checkout"].forEach((href) => router.prefetch(href));
  }, [sidebarOpen, router]);

  const handleNav = (href: string) => {
    startTransition(() => router.push(href));
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground md:pl-64">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} handleNav={handleNav} user={user} profile={profile} basketCount={basketCount} />

      <div className="min-w-0">
        <header className="safe-top sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-black/5 bg-white/95 px-3 shadow-[0_1px_10px_rgba(0,0,0,.04)] backdrop-blur md:hidden">
          <button
            type="button"
            aria-label="Open account menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF6F1]"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <p className="truncate text-sm font-semibold text-[#2d2a26]">{pageTitle(pathname)}</p>

          <button
            type="button"
            aria-label={`Open ticket basket${basketCount ? `, ${basketCount} ticket${basketCount === 1 ? "" : "s"}` : ""}`}
            onClick={() => handleNav("/events/checkout")}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF6F1]"
          >
            <Ticket className="h-5 w-5" />
            {basketCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#17221f] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                {basketCount > 99 ? "99+" : basketCount}
              </span>
            ) : null}
          </button>
        </header>

        <main className="min-h-[calc(100dvh-3.5rem)] overflow-x-hidden px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-5 md:min-h-dvh md:p-8">
          <Suspense fallback={<div className="px-2 py-6 text-sm text-neutral-500">Loading…</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
