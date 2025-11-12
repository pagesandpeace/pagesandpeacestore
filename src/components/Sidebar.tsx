"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { signOut } from "@/lib/auth/actions";
import { useRouter } from "next/navigation";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}

type MeResponse = {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  loyaltyprogram?: boolean | null;
};

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  className = "",
}: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("User");
  const [isInLoyaltyProgram, setIsInLoyaltyProgram] = useState<boolean>(false);
  const router = useRouter();

  const accountRef = useRef<HTMLDivElement | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) {
        console.warn("[Sidebar] /api/me status:", res.status);
        return;
      }
      const me: MeResponse = await res.json();
      setUserImage(me.image ?? null);
      setUserName(me.name || "User");
      setIsInLoyaltyProgram(Boolean(me.loyaltyprogram));
    } catch (err) {
      console.error("[Sidebar] Failed to fetch /api/me:", err);
    }
  }, []);

  useEffect(() => {
    fetchUser(); // initial
  }, [fetchUser]);

  // Refresh when dashboard join completes
  useEffect(() => {
    const onLoyaltyUpdated = () => fetchUser();
    window.addEventListener("pp:loyalty-updated", onLoyaltyUpdated);
    return () => window.removeEventListener("pp:loyalty-updated", onLoyaltyUpdated);
  }, [fetchUser]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.push("/");
    }
  };

  // Close account dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (accountRef.current && !accountRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className={className}>
      {/* Backdrop (mobile only) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        id="sidebar"
        className={[
          "fixed top-0 left-0 z-50 h-full w-64",
          "bg-[#FAF6F1] border-r border-[#dcd6cf] px-6 py-10",
          "transform transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "md:static md:z-auto md:translate-x-0 md:h-auto",
        ].join(" ")}
      >
        {/* Close (mobile only) */}
        <button
          type="button" /* ✅ explicit, avoids accidental submit */
          aria-label="Close menu"
          className="md:hidden absolute right-3 top-3 rounded p-2 hover:bg-black/5"
          onClick={() => setSidebarOpen(false)}
        >
          <XMarkIcon className="h-6 w-6 text-gray-800" />
        </button>

        {/* Logo */}
        <button
          type="button" /* ✅ explicit */
          onClick={() => {
            setSidebarOpen(false);
            router.push("/dashboard");
          }}
          aria-label="Go to dashboard"
          className="flex items-center justify-center focus:outline-none"
          style={{ backgroundColor: "transparent", border: "none" }}
        >
          <Image
            src="/p&p_logo_cream.svg"
            alt="Pages & Peace logo"
            width={100}
            height={100}
            className="object-contain bg-transparent"
            priority
          />
        </button>

        {/* Nav Links */}
        <nav className="flex flex-col gap-y-5 text-sm mt-6">
          <Link
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="hover:text-[#5DA865]"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/orders"
            onClick={() => setSidebarOpen(false)}
            className="hover:text-[#5DA865]"
          >
            Orders
          </Link>
          <Link
            href="/dashboard/settings"
            onClick={() => setSidebarOpen(false)}
            className="hover:text-[#5DA865]"
          >
            Settings
          </Link>
        </nav>

        {/* Divider between settings and account */}
        <hr className="my-6 border-t border-[#dcd6cf]" />

        {/* Account section (with loyalty badge) */}
        <div className="relative" ref={accountRef}>
          <button
            type="button" /* ✅ explicit */
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="
              flex items-center gap-3 w-full text-left
              rounded-md px-2 py-2
              transition-colors
              hover:bg-[#f1ede7] hover:text-[#2f6b3a]
              focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30
              cursor-pointer
            "
          >
            <Image
              src={userImage || "/user_avatar_placeholder.svg"}
              alt="User avatar"
              width={36}
              height={36}
              className="rounded-full border border-[#ccc] object-cover"
            />
            <span className="font-medium text-sm">{userName}</span>
          </button>

          {/* Loyalty badge ONLY in sidebar */}
          {isInLoyaltyProgram && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#E5F7E4] px-3 py-1 text-xs font-medium text-[#2f7c3e]">
              <span>Chapters Club</span>
              <span aria-hidden>🎉</span>
            </div>
          )}

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute bottom-12 left-0 bg-white border border-[#dcd6cf] rounded-md py-1 w-44 shadow-sm">
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

              {/* thin divider */}
              <div className="my-1 border-t border-[#eee]" />

              {/* Sign out as lightweight text item */}
              <button
                type="button" /* ✅ explicit */
                onClick={handleSignOut}
                className="
                  block w-full text-left
                  px-4 py-2 text-sm
                  text-red-600 hover:bg-[#FAF6F1] hover:text-red-700
                  transition
                "
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
