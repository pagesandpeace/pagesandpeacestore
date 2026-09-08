"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export type UserProfile = {
  id: string;
  auth_user_id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: "admin" | "customer";
};

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  handleNav: (href: string) => void;
  user: User;
  profile: UserProfile | null;
};

export default function Sidebar({ sidebarOpen, setSidebarOpen, handleNav, user, profile }: SidebarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(profile);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setLocalProfile(profile); }, [profile]);

  useEffect(() => {
    const refreshProfile = async () => {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        if (!data) return;
        setLocalProfile((prev) => ({ ...(prev ?? {}), ...data }));
      } catch (err) { console.error("Failed to refresh profile", err); }
    };
    window.addEventListener("pp:user-should-refresh", refreshProfile);
    return () => window.removeEventListener("pp:user-should-refresh", refreshProfile);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await fetch("/auth/signout", { method: "POST" });
    window.dispatchEvent(new Event("pp:auth-updated"));
    router.push("/sign-in");
  };

  return <><>{sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}</>
    <aside className={`fixed top-0 left-0 z-50 w-64 bg-[#FAF6F1] border-r border-[#dcd6cf] flex flex-col justify-between transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 min-h-dvh`}>
      <div className="px-6 pt-10">
        <button className="md:hidden absolute right-3 top-3 p-2 hover:bg-black/5 rounded" onClick={() => setSidebarOpen(false)}><XMarkIcon className="w-6 h-6 text-gray-800" /></button>
        <button onClick={() => handleNav("/dashboard")} className="flex items-center justify-center"><Image src="/p&p_logo_cream.svg" alt="Pages & Peace logo" width={100} height={100} /></button>
        <nav className="mt-6 space-y-4 text-sm text-left">
          <button onClick={() => handleNav("/dashboard")} className="block hover:text-[#5DA865]">Dashboard</button>
          <button onClick={() => handleNav("/dashboard/events")} className="block hover:text-[#5DA865]">My events</button>
          <button onClick={() => handleNav("/dashboard/orders")} className="block hover:text-[#5DA865]">Order history</button>
          <button onClick={() => handleNav("/events")} className="block hover:text-[#5DA865]">Browse events</button>
        </nav>
      </div>
      <div ref={accountRef} className="border-t border-[#ded7cf] px-6 py-6 bg-[#FAF6F1]">
        <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-3 w-full text-left rounded-md px-2 py-2 hover:bg-[#f1ede7]">
          <Image src={localProfile?.image ?? "/user_avatar_placeholder.svg"} alt="avatar" width={36} height={36} className="rounded-full border object-cover" />
          <div className="flex flex-col leading-tight overflow-hidden"><span className="font-medium text-xs truncate">{localProfile?.name || user.email || "User"}</span></div>
        </button>
        {menuOpen && <div className="absolute bottom-[110px] left-6 bg-white border rounded-md shadow p-1 w-44 z-50">
          <button onClick={() => handleNav("/dashboard/account")} className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAF6F1]">My Account</button>
          <button onClick={() => handleNav("/dashboard/settings")} className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAF6F1]">Settings</button>
          <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-[#FAF6F1]">Sign out</button>
        </div>}
      </div>
    </aside>
  </>;
}
