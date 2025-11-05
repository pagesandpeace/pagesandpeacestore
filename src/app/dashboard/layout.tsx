"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { signOut, getCurrentUser } from "@/lib/auth/actions";
import { useRouter } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    router.push("/"); // go back to marketing site only after sign-out
  };

  const fetchUser = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setUserImage(user?.image || null);
    } catch (err) {
      console.error("❌ Failed to fetch user for sidebar:", err);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userAvatarUpdated") fetchUser();
    };
    const handleAvatarUpdated = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) setUserImage(custom.detail);
      else fetchUser();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("avatar-updated", handleAvatarUpdated);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("avatar-updated", handleAvatarUpdated);
    };
  }, [fetchUser]);

  return (
    <div className="flex h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] overflow-hidden md:overflow-auto">
      {/* ── Mobile Top Bar ── */}
<header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-[#FAF6F1] border-b border-[#dcd6cf] px-4 py-3 md:hidden">
  {/* Hamburger on the LEFT */}
  <button
    onClick={() => {
      setSidebarOpen((prev) => !prev);
      setMenuOpen(false);
    }}
    aria-label="Toggle menu"
    className="flex items-center justify-center p-2 rounded-md bg-transparent border-none focus:outline-none"
    style={{
      background: "transparent",
      border: "none",
      outline: "none",
    }}
  >
    <div className="space-y-1.5">
      <span className="block w-6 h-[2px] bg-[#111]" />
      <span className="block w-6 h-[2px] bg-[#111]" />
      <span className="block w-6 h-[2px] bg-[#111]" />
    </div>
  </button>

  {/* Logo on the RIGHT */}
  <button
    onClick={() => router.push("/dashboard")}
    aria-label="Go to dashboard"
    className="flex items-center justify-center bg-transparent border-none p-0"
    style={{
      background: "transparent",
      border: "none",
      outline: "none",
    }}
  >
    <Image
      src="/p&p_logo_cream.svg"
      alt="Pages & Peace logo"
      width={48}
      height={48}
      priority
      className="bg-transparent !bg-none !rounded-none !shadow-none"
    />
  </button>
</header>


      {/* ── Sidebar ── */}
      <aside
        className={`fixed z-50 top-0 left-0 h-full bg-[#FAF6F1] border-r border-[#dcd6cf]
          flex flex-col justify-between px-6 py-8 w-64
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:flex-shrink-0
        `}
      >
        <div>
          {/* Logo (desktop only) */}
          <button
            onClick={() => router.push("/dashboard")}
            aria-label="Go to dashboard"
            className="hidden md:flex items-center justify-center mb-12 hover:opacity-90 transition bg-transparent border-none p-0"
            style={{ background: "transparent", border: "none", outline: "none" }}
          >
            <Image
              src="/p&p_logo_cream.svg"
              alt="Pages & Peace logo"
              width={60}
              height={60}
              priority
              className="bg-transparent !bg-none !rounded-none !shadow-none"
            />
          </button>

          {/* Nav Links */}
          <nav className="flex flex-col space-y-5 text-sm">
            <Link href="/dashboard" onClick={() => setSidebarOpen(false)} className="hover:text-[#5DA865] transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard/orders" onClick={() => setSidebarOpen(false)} className="hover:text-[#5DA865] transition-colors">
              Orders
            </Link>
            <Link href="/dashboard/account/security" onClick={() => setSidebarOpen(false)} className="hover:text-[#5DA865] transition-colors">
              Security
            </Link>
            <Link href="/dashboard/settings" onClick={() => setSidebarOpen(false)} className="hover:text-[#5DA865] transition-colors">
              Settings
            </Link>
          </nav>
        </div>

        {/* Bottom Account Dropdown */}
        <div className="relative">
          <button onClick={() => setMenuOpen((prev) => !prev)} className="flex items-center gap-3 w-full text-left hover:opacity-90">
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
            <div className="absolute bottom-12 left-0 bg-white border border-[#dcd6cf] rounded-md py-2 w-44 shadow-sm md:block">
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

      {/* ── Dim background for mobile menu ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => {
            setSidebarOpen(false);
            setMenuOpen(false);
          }}
        />
      )}

      {/* ── Main Content ── */}
      <main
        className="
          flex-1 overflow-y-auto
          pt-[80px] md:pt-0
          px-4 sm:px-6 md:px-8
          flex flex-col items-center md:items-start
          transition-all duration-300
        "
      >
        <div className="w-full max-w-[1100px]">{children}</div>
      </main>
    </div>
  );
}
