// src/components/Sidebar.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/auth/actions"; // keep this if it's client-safe
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

  // Fetch current user (client-safe)
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
    fetchUser();
  }, [fetchUser]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.push("/");
    }
  };

  // Close sidebar by clicking backdrop (you already have this behavior)
  // Close Account dropdown when clicking outside it
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
          type="button"
          aria-label="Close menu"
          className="md:hidden absolute right-3 top-3 rounded p-2 hover:bg-black/5"
          onClick={() => setSidebarOpen(false)}
        >
          <XMarkIcon className="h-6 w-6 text-gray-800" />
        </button>

        {/* Logo */}
        <button
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
            href="/orders"
            onClick={() => setSidebarOpen(false)}
            className="hover:text-[#5DA865]"
          >
            Orders
          </Link>
          <Link
            href="/settings"
            onClick={() => setSidebarOpen(false)}
            className="hover:text-[#5DA865]"
          >
            Settings
          </Link>
        </nav>

        {/* Account section (with loyalty badge) */}
        <div className="relative mt-8" ref={accountRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-3 w-full text-left hover:opacity-90"
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

          {/* Loyalty badge ALWAYS visible if true */}
          {isInLoyaltyProgram && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#E5F7E4] px-3 py-1 text-xs font-medium text-[#2f7c3e]">
              <span>Chapters Club</span>
              <span aria-hidden>🎉</span>
            </div>
          )}

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute bottom-12 left-0 bg-white border border-[#dcd6cf] rounded-md py-2 w-44 shadow-sm">
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

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-1"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
