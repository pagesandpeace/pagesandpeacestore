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
    <aside className="w-64 bg-white border-r px-6 py-10 flex flex-col space-y-8">
      
      {/* Logo */}
      <div className="flex justify-center">
        <Image
          src="/p&p_logo_cream.svg"
          alt="Pages & Peace Logo"
          width={90}
          height={90}
          className="object-contain"
        />
      </div>

      {/* Admin Nav */}
      <nav className="space-y-4 text-sm font-medium">
        <Link href="/admin" className="block hover:text-[var(--secondary)]">
          Dashboard
        </Link>

        <Link href="/admin/events" className="block hover:text-[var(--secondary)]">
          Events
        </Link>

        <Link href="/admin/events/new" className="block hover:text-[var(--secondary)]">
          Create Event
        </Link>

        <Link href="/admin/account" className="block hover:text-[var(--secondary)]">
          My Account
        </Link>
      </nav>

      <div className="flex-1" />

      {/* Account Section */}
      {!loading && user && (
        <div className="border-t border-neutral-200 pt-6" ref={accountRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-3 w-full rounded-md px-2 py-2 hover:bg-neutral-100 transition"
          >
            <Image
              src={user.image || "/user_avatar_placeholder.svg"}
              alt="Avatar"
              width={40}
              height={40}
              className="rounded-full border border-neutral-300 object-cover"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.name || "Admin"}</span>

              {/* ADMIN BADGE */}
              <span className="inline-block text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-300">
                ADMIN
              </span>
            </div>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="mt-2 bg-white border border-neutral-200 rounded-md shadow-sm py-1 text-sm w-full">
              <Link
                href="/admin/account"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 hover:bg-neutral-50"
              >
                My Account
              </Link>

              <div className="border-t border-neutral-200 my-1" />

              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 text-red-600 hover:bg-neutral-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
