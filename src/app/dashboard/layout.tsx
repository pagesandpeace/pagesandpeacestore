"use client";

import { useState, useEffect, startTransition, Suspense } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  /* -----------------------------------------
     PREFETCH KEY ROUTES WHEN SIDEBAR OPENS
  ----------------------------------------- */
  useEffect(() => {
    if (!sidebarOpen) return;

    router.prefetch("/dashboard");
    router.prefetch("/dashboard/events");
    router.prefetch("/dashboard/orders");
    router.prefetch("/dashboard/settings");
    router.prefetch("/dashboard/account");
    router.prefetch("/dashboard/chapters-club");
    router.prefetch("/shop");
  }, [sidebarOpen, router]);

  /* -----------------------------------------
     ULTRA-SMOOTH NAVIGATION HANDLER
  ----------------------------------------- */
  const handleNav = (href: string) => {
    // Begin route change immediately
    startTransition(() => {
      router.push(href);
    });

    // Smoothly close sidebar just after transition starts
    setTimeout(() => {
      setSidebarOpen(false);
    }, 30);
  };

  return (
    <div className="flex min-h-screen bg-background">

      {/* SIDEBAR (fixed) */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        handleNav={handleNav}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">

        {/* TOP BAR (mobile only) */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-white px-4 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            className="inline-flex items-center justify-center rounded p-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6 text-gray-800" />
          </button>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 md:p-8">
          <Suspense fallback={<div className="opacity-60 text-sm">Loading…</div>}>
            {children}
          </Suspense>
        </main>

      </div>
    </div>
  );
}
