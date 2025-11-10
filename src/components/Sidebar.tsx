// src/components/Sidebar.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { getCurrentUser, signOut } from "@/lib/auth/actions";
import { useRouter } from "next/navigation";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar?: () => void;                 // ✅ added
  className?: string;                         // ✅ added
}

type User = {
  id: string;
  name?: string;
  email: string;
  image?: string | null;
  loyaltyprogram?: boolean;
} | null;

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  toggleSidebar,                               // ✅ receive it
  className = "",
}: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isInLoyaltyProgram, setIsInLoyaltyProgram] = useState<boolean>(false);
  const router = useRouter();

  // Fetch user data and loyalty status
  const fetchUser = useCallback(async () => {
    try {
      const user: User = await getCurrentUser();
      setUserImage(user?.image || null);
      setUserName(user?.name || "User");
      setIsInLoyaltyProgram(Boolean(user?.loyaltyprogram));
    } catch (err) {
      console.error("Failed to fetch user for sidebar:", err);
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

  const handleHamburgerClick = () => {
    if (toggleSidebar) toggleSidebar();       // ✅ prefer parent toggle if provided
    else setSidebarOpen((prev) => !prev);     // fallback
  };

  // Close the sidebar when clicking outside
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        sidebarOpen &&
        !target.closest("#sidebar") &&
        !target.closest("#hamburger")
      ) {
        setSidebarOpen(false);
      }
    },
    [sidebarOpen, setSidebarOpen]
  );

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div className={className}>
      {/* Hamburger for Sidebar (mobile) */}
      <button
        id="hamburger"
        type="button"
        className="inline-flex items-center justify-center p-2 md:hidden"
        aria-controls="sidebar-menu"
        aria-expanded={sidebarOpen ? "true" : "false"}
        onClick={handleHamburgerClick}
      >
        {sidebarOpen ? (
          <XMarkIcon className="w-6 h-6 text-gray-800" />
        ) : (
          <Bars3Icon className="w-6 h-6 text-gray-800" />
        )}
      </button>

      {/* Sidebar */}
      <div
        id="sidebar"
        className={`absolute top-0 left-0 w-64 h-full bg-[#FAF6F1] border-r border-[#dcd6cf] px-6 py-10 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static`}
      >
        {/* Logo */}
        <button
          onClick={() => router.push("/dashboard")}
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

        {/* Account Dropdown */}
        <div className="relative mt-8">
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

          {/* Loyalty Badge */}
          {isInLoyaltyProgram && (
            <div className="mt-2 text-sm text-[#5DA865] bg-[#E5F7E4] px-2 py-1 rounded-full w-max">
              Loyalty Member 🎉
            </div>
          )}

          {/* Dropdown Menu */}
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
