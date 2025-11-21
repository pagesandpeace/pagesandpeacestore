"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@/lib/auth/useUser";
import { signOut } from "@/lib/auth/actions";
import { useRouter } from "next/navigation";

export default function AdminSidebar() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      const target = e.target as Node;
      if (accountRef.current && !accountRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <aside
      className="
        fixed top-0 left-0 z-50
        w-64 h-screen
        bg-[#FAF6F1] border-r border-[#dcd6cf]
        flex flex-col justify-between
        transition-transform duration-300
      "
    >
      {/* TOP SECTION */}
      <div className="px-6 pt-10">
        {/* Logo */}
        <button
          onClick={() => router.push("/admin")}
          className="flex items-center justify-center"
        >
          <Image
            src="/p&p_logo_cream.svg"
            alt="Pages & Peace Logo"
            width={100}
            height={100}
          />
        </button>

        {/* NAVIGATION – scrollable */}
        <div className="mt-6 text-sm max-h-[60vh] overflow-y-auto pr-2 pb-4">
          <nav className="flex flex-col gap-y-5">

            <button
              onClick={() => router.push("/admin/dashboard")}
              className="text-left hover:text-[#5DA865]"
            >
              Dashboard
            </button>

            <button
              onClick={() => router.push("/admin/events")}
              className="text-left hover:text-[#5DA865]"
            >
              Events
            </button>

            <button
              onClick={() => router.push("/admin/events/new")}
              className="text-left hover:text-[#5DA865]"
            >
              Create Event
            </button>

            {/* --- NEWSLETTER MANAGER --- */}
            <button
              onClick={() => router.push("/admin/newsletter")}
              className="text-left hover:text-[#5DA865]"
            >
              Newsletter Manager
            </button>

            <button
              onClick={() => router.push("/admin/newsletter/history")}
              className="text-left hover:text-[#5DA865]"
            >
              Blast History
            </button>

          </nav>
        </div>
      </div>

      {/* BOTTOM ACCOUNT SECTION */}
      <div
        ref={accountRef}
        className="border-t border-[#ded7cf] px-6 py-6 bg-[#FAF6F1]"
      >
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
                className="rounded-full border object-cover"
              />
              <div className="flex flex-col">
                <span className="font-medium text-sm">{user.name || "Admin"}</span>
                <span className="mt-1 inline-block text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded-full border border-red-300">
                  Admin
                </span>
              </div>
            </button>

            {menuOpen && (
              <div className="absolute bottom-20 left-6 bg-white border rounded-md shadow p-1 w-44">
                <button
                  onClick={() => router.push("/admin/account")}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAF6F1]"
                >
                  My Account
                </button>
                <button
                  onClick={() => router.push("/admin/settings")}
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
          </>
        ) : (
          <button
            onClick={() => router.push("/sign-in")}
            className="block w-full text-center px-4 py-2 border rounded-md text-[#5DA865] border-[#5DA865] hover:bg-[#5DA865] hover:text-white"
          >
            Sign in
          </button>
        )}
      </div>
    </aside>
  );
}
