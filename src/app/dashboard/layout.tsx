"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { signOut, getCurrentUser } from "@/lib/auth/actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // menuOpen = your original account dropdown
  const [menuOpen, setMenuOpen] = useState(false);

  // sidebarOpen = controls mobile slide-in sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // avatar image
  const [userImage, setUserImage] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  // fetch logged-in user avatar
  const fetchUser = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setUserImage(user?.image || null);
    } catch (err) {
      console.error("❌ Failed to fetch user for sidebar:", err);
    }
  }, []);

  // initial avatar fetch
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // live avatar updates (same tab + cross tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userAvatarUpdated") fetchUser();
    };

    const handleAvatarUpdated = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        // update instantly with new URL
        setUserImage(custom.detail);
      } else {
        // fallback refetch
        fetchUser();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("avatar-updated", handleAvatarUpdated);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("avatar-updated", handleAvatarUpdated);
    };
  }, [fetchUser]);

  return (
    <div className="flex h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat]">
      {/* ── Mobile Top Bar (only visible < md) ── */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-[#FAF6F1] border-b border-[#dcd6cf] px-4 py-3 md:hidden">
        {/* brand */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/p&p_logo_green.svg"
            alt="Pages & Peace logo"
            width={32}
            height={32}
          />
          <span className="text-base font-semibold tracking-wide">
            Pages & Peace
          </span>
        </Link>

        {/* hamburger */}
        <button
          onClick={() => {
            setSidebarOpen((prev) => !prev);
            // close account dropdown if it was open
            setMenuOpen(false);
          }}
          aria-label="Toggle menu"
          className="p-2 rounded-md hover:bg-[#E9E4DE] focus:outline-none"
        >
          <div className="space-y-1">
            <span className="block w-6 h-[2px] bg-[#111]" />
            <span className="block w-6 h-[2px] bg-[#111]" />
            <span className="block w-6 h-[2px] bg-[#111]" />
          </div>
        </button>
      </header>

      {/* ── Sidebar (desktop: fixed open | mobile: slide-in) ── */}
      <aside
        className={`
          fixed z-30 top-0 left-0 h-full bg-[#FAF6F1] border-r border-[#dcd6cf]
          flex flex-col justify-between px-6 py-8 w-64
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:flex-shrink-0
        `}
      >
        {/* Top section */}
        <div>
          {/* Logo (hidden on mobile because it's in header already) */}
          <Link
            href="/"
            className="hidden md:flex items-center gap-3 mb-12"
          >
            <Image
              src="/p&p_logo_green.svg"
              alt="Pages & Peace logo"
              width={40}
              height={40}
              priority
            />
            <span className="text-lg font-semibold tracking-wide">
              Pages & Peace
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex flex-col space-y-5 text-sm">
            <Link
              href="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className="hover:text-[#5DA865] transition-colors"
            >
              Dashboard
            </Link>

            <Link
              href="/dashboard/orders"
              onClick={() => setSidebarOpen(false)}
              className="hover:text-[#5DA865] transition-colors"
            >
              Orders
            </Link>

            <Link
              href="/dashboard/account/security"
              onClick={() => setSidebarOpen(false)}
              className="hover:text-[#5DA865] transition-colors"
            >
              Security
            </Link>

            <Link
              href="/dashboard/settings"
              onClick={() => setSidebarOpen(false)}
              className="hover:text-[#5DA865] transition-colors"
            >
              Settings
            </Link>
          </nav>
        </div>

        {/* Bottom section – keep your avatar dropdown logic */}
        <div className="relative">
          <button
            onClick={() => {
              // toggle dropdown
              setMenuOpen((prev) => !prev);
            }}
            className="flex items-center gap-3 w-full text-left hover:opacity-90"
          >
            <Image
              src={userImage || "/user_avatar_placeholder.svg"}
              alt="User avatar"
              width={36}
              height={36}
              className="rounded-full border border-[#ccc] object-cover"
            />
            <span className="font-medium text-sm">Account</span>
          </button>

          {menuOpen && (
            <div
              className="
                absolute bottom-12 left-0 bg-white border border-[#dcd6cf]
                rounded-md py-2 w-44 shadow-sm
                md:block
              "
            >
              <Link
                href="/dashboard/account"
                onClick={() => {
                  setMenuOpen(false);
                  setSidebarOpen(false);
                }}
                className="block px-4 py-2 text-sm hover:bg-[#FAF6F1] transition"
              >
                My Account
              </Link>

              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAF6F1] transition"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Dim background when sidebar is open on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-20 md:hidden"
          onClick={() => {
            setSidebarOpen(false);
            setMenuOpen(false);
          }}
        />
      )}

    {/* Main Content Area */}
<main
  className="
    flex-1 overflow-y-auto
    pt-[10px] md:pt-12
    md:ml-64
    px-4 sm:px-6 md:px-6 lg:px-8 xl:px-10
    transition-all duration-300
  "
>
  <div
    className="
      max-w-[1000px] md:max-w-[1100px] lg:max-w-[1200px]
      w-full mx-auto
      md:ml-0
      md:pr-4 lg:pr-8
    "
  >
    {children}
  </div>
</main>






    </div>
  );
}
