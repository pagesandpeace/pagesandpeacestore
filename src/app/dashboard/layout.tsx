"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Sidebar overlay / panel */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* 🔸 Dashboard header with hamburger */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-white px-4 md:px-6">
          <button
            type="button"
            aria-label="Open menu"
            className="inline-flex items-center justify-center rounded p-2 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6 text-gray-800" />
          </button>
        </header>

        {/* Page body */}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
