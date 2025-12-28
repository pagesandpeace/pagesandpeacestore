"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */

export type UserProfile = {
  id: string;
  auth_user_id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: "admin" | "customer";
};

type LoyaltyState = {
  member: boolean;
  tier?: string;
};

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  handleNav: (href: string) => void;
  user: User;
  profile: UserProfile | null;
};

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  handleNav,
  user,
  profile,
}: SidebarProps) {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loyalty, setLoyalty] = useState<LoyaltyState | null>(null);

  // 🔥 LOCAL PROFILE STATE (KEY FIX)
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(profile);

  const accountRef = useRef<HTMLDivElement | null>(null);

  /* -------------------------------------------------------
     Keep local profile in sync with initial prop
  ------------------------------------------------------- */
  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  /* -------------------------------------------------------
     Listen for profile updates (avatar/name/etc)
  ------------------------------------------------------- */



  /* -------------------------------------------------------
     Close dropdown when clicking outside
  ------------------------------------------------------- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        accountRef.current &&
        !accountRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* -------------------------------------------------------
     Fetch loyalty status
  ------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/loyalty/me");
        if (!res.ok) return;

        const data = await res.json();
        if (mounted) setLoyalty(data);
      } catch (err) {
        console.error("❌ Failed to load loyalty status", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  /* -------------------------------------------------------
     Sign out
  ------------------------------------------------------- */
  const handleSignOut = async () => {
    await fetch("/auth/signout", { method: "POST" });
    window.dispatchEvent(new Event("pp:auth-updated"));
    router.push("/sign-in");
  };

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */
  return (
    <>
      {/* BACKDROP (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 left-0 z-50 w-64 
          bg-[#FAF6F1] border-r border-[#dcd6cf]
          flex flex-col justify-between
          transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 min-h-dvh`}
      >
        {/* TOP SECTION */}
        <div className="px-6 pt-10">
          {/* MOBILE CLOSE */}
          <button
            className="md:hidden absolute right-3 top-3 p-2 hover:bg-black/5 rounded"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="w-6 h-6 text-gray-800" />
          </button>

          {/* LOGO */}
          <button
            onClick={() => handleNav("/dashboard")}
            className="flex items-center justify-center"
          >
            <Image
              src="/p&p_logo_cream.svg"
              alt="Pages & Peace logo"
              width={100}
              height={100}
            />
          </button>

          {/* NAVIGATION */}
          <nav className="mt-6 space-y-4 text-sm text-left">
            <button onClick={() => handleNav("/dashboard")} className="block hover:text-[#5DA865]">
              Dashboard
            </button>

            <button onClick={() => handleNav("/dashboard/events")} className="block hover:text-[#5DA865]">
              Events
            </button>

            <button onClick={() => handleNav("/dashboard/orders")} className="block hover:text-[#5DA865]">
              Orders
            </button>

            <button onClick={() => handleNav("/shop")} className="block hover:text-[#5DA865]">
              Shop
            </button>

            <button
              onClick={() => handleNav("/dashboard/chapters-club")}
              className="flex items-center gap-2 hover:text-[#5DA865]"
            >
              Chapters Club
              <span className="bg-[#E5F7E4] text-[#2f6b3a] rounded-full border px-2 py-1 text-xs font-semibold">
                Coming Soon 🚀
              </span>
            </button>
          </nav>
        </div>

        {/* ACCOUNT SECTION */}
        <div
          ref={accountRef}
          className="border-t border-[#ded7cf] px-6 py-6 bg-[#FAF6F1]"
        >
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 w-full text-left rounded-md px-2 py-2 hover:bg-[#f1ede7]"
          >
            <Image
              src={localProfile?.image ?? "/user_avatar_placeholder.svg"}
              alt="avatar"
              width={36}
              height={36}
              className="rounded-full border object-cover"
            />

            <div className="flex flex-col leading-tight overflow-hidden">
  <span className="font-medium text-xs truncate">
    {localProfile?.name || user.email || "User"}
  </span>

  {loyalty?.member && (
    <span className="mt-1 inline-flex w-fit items-center rounded-full 
      bg-[#E5F7E4] border border-[#cce6cc] 
      px-2 py-[2px] text-[10px] font-semibold text-[#2f6b3a]">
      Chapters Club
      {loyalty.tier && (
        <span className="ml-1 opacity-70">
          {loyalty.tier.charAt(0).toUpperCase() + loyalty.tier.slice(1)}
        </span>
      )}
    </span>
  )}
</div>

          </button>

          {menuOpen && (
            <div className="absolute bottom-[110px] left-6 bg-white border rounded-md shadow p-1 w-44 z-50">
              <button
                onClick={() => handleNav("/dashboard/account")}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAF6F1]"
              >
                My Account
              </button>

              <button
                onClick={() => handleNav("/dashboard/settings")}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAF6F1]"
              >
                Settings
              </button>

              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-[#FAF6F1]"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
