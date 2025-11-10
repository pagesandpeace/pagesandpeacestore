"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar"; // Import the Sidebar component

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Toggle sidebar function
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      {/* ---- Page Container (Main Content + Sidebar) ---- */}
      <div className="flex flex-1">
        {/* ---- Sidebar (for mobile) ---- */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen} // Pass setSidebarOpen to Sidebar
          toggleSidebar={toggleSidebar} // Pass toggleSidebar to Sidebar
          className="md:block w-64 bg-white" // Set sidebar width
        /> {/* Sidebar will toggle open/close on mobile */}

        {/* ---- Main Content Area ---- */}
        <main className="flex-1 pt-4 md:pt-16 px-6 md:px-8">
          {/* Add transition for smooth layout when sidebar opens/closes */}
          {children} {/* Main content */}
        </main>
      </div>
    </div>
  );
}
