"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { signOut } from "@/lib/auth/actions";
import { useUser } from "@/context/UserContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    console.log("👤 [DashboardLayout] user changed:", user);
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat]">
      <aside className="w-64 flex flex-col justify-between border-r border-[#dcd6cf] bg-[#FAF6F1] px-6 py-8 fixed h-screen">
        <div>
          <Link href="/" className="flex items-center gap-3 mb-12">
            <Image
              src="/p&p_logo_green.svg"
              alt="Pages & Peace logo"
              width={40}
              height={40}
              priority
            />
            <span className="text-lg font-semibold tracking-wide">Pages & Peace</span>
          </Link>

          <nav className="flex flex-col space-y-5 text-sm">
            <Link href="/dashboard" className="hover:text-[#5DA865] transition-colors">Dashboard</Link>
            <Link href="/dashboard/orders" className="hover:text-[#5DA865] transition-colors">Orders</Link>
            <Link href="/dashboard/account/security" className="hover:text-[#5DA865] transition-colors">Security</Link>
            <Link href="/dashboard/settings" className="hover:text-[#5DA865] transition-colors">Settings</Link>
          </nav>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="flex items-center gap-3 w-full text-left hover:opacity-90"
          >
            <Image
              src={user?.image || "/user_avatar_placeholder.svg"}
              alt="User avatar"
              width={36}
              height={36}
              className="rounded-full border border-[#ccc] object-cover"
            />
            <span className="font-medium text-sm">{user?.name || "Account"}</span>
          </button>

          {menuOpen && (
            <div className="absolute bottom-12 left-0 bg-white border border-[#dcd6cf] rounded-md py-2 w-44 shadow-sm">
              <Link
                href="/dashboard/account"
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

      <main className="flex-1 ml-64 overflow-y-auto p-12">{children}</main>
    </div>
  );
}
