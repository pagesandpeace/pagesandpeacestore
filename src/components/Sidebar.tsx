"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { signOut } from "@/lib/auth/actions";
import { useUser } from "@/lib/auth/useUser";
import { useRouter } from "next/navigation";

export default function Sidebar({ sidebarOpen, setSidebarOpen }: any) {
  const { user, loading } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 z-50
          h-screen w-64
          bg-[#FAF6F1] border-r border-[#dcd6cf]
          flex flex-col
          px-6 pt-10
          transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Close button */}
        <button
          className="md:hidden absolute right-3 top-3 p-2 hover:bg-black/5 rounded"
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
          className="flex items-center justify-center"
        >
          <Image
            src="/p&p_logo_cream.svg"
            alt="Pages & Peace logo"
            width={100}
            height={100}
          />
        </button>

        {/* SCROLLABLE SECTION */}
        <div className="flex-1 overflow-y-auto pb-32 mt-6 text-sm">

          <nav className="flex flex-col gap-y-5">
            <Link href="/dashboard" className="hover:text-[#5DA865]">Dashboard</Link>
            <Link href="/dashboard/events" className="hover:text-[#5DA865]">Events</Link>
            <Link href="/dashboard/orders" className="hover:text-[#5DA865]">Orders</Link>
            <Link href="/dashboard/settings" className="hover:text-[#5DA865]">Settings</Link>
            <Link href="/shop" className="hover:text-[#5DA865]">Shop</Link>

            <Link
              href="/dashboard/chapters-club"
              className="hover:text-[#5DA865] flex items-center gap-2"
            >
              <span>Chapters Club</span>
              <span className="bg-[#E5F7E4] text-[#2f6b3a] rounded-full border px-2.5 py-1 text-xs font-semibold">
                Coming Soon 🚀
              </span>
            </Link>
          </nav>
        </div>

        {/* FIXED BOTTOM ACCOUNT SECTION */}
        <div ref={accountRef} className="absolute bottom-6 left-0 px-6 w-full">

          {!loading && user ? (
            <>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-3 w-full text-left rounded-md px-2 py-2 hover:bg-[#f1ede7]"
              >
                <Image
                  src={user.image || "/user_avatar_placeholder.svg"}
                  alt="User avatar"
                  width={36}
                  height={36}
                  className="rounded-full border"
                />
                <span className="font-medium text-sm">{user.name || "User"}</span>
              </button>

              {menuOpen && (
                <div className="absolute bottom-14 left-6 bg-white border rounded-md shadow p-1 w-44">
                  <Link
                    href="/dashboard/account"
                    className="block px-4 py-2 text-sm hover:bg-[#FAF6F1]"
                  >
                    My Account
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-[#FAF6F1]"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link
              href="/sign-in"
              className="block text-center px-4 py-2 border rounded-md text-[#5DA865] border-[#5DA865] hover:bg-[#5DA865] hover:text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
