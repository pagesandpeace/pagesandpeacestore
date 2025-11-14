"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { signOut } from "@/lib/auth/actions";
import { useUser } from "@/lib/auth/useUser";
import { useRouter } from "next/navigation";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  className = "",
}: SidebarProps) {
  const { user, loading } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const accountRef = useRef<HTMLDivElement | null>(null);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    setSidebarOpen(false);
    router.refresh();
    router.push("/");
  };

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
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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
          type="button"
          onClick={() => {
            setSidebarOpen(false);
            router.push("/dashboard");
          }}
          aria-label="Go to dashboard"
          className="flex items-center justify-center"
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

        {/* Links */}
        <nav className="flex flex-col gap-y-5 text-sm mt-6">
          <Link href="/dashboard" onClick={() => setSidebarOpen(false)} className="hover:text-[#5DA865]">
            Dashboard
          </Link>

          {/* ⭐ NEW — Events */}
          <Link href="/dashboard/events" onClick={() => setSidebarOpen(false)} className="hover:text-[#5DA865]">
  Events
</Link>

          <Link href="/dashboard/orders" onClick={() => setSidebarOpen(false)} className="hover:text-[#5DA865]">
            Orders
          </Link>

          <Link href="/dashboard/settings" onClick={() => setSidebarOpen(false)} className="hover:text-[#5DA865]">
            Settings
          </Link>

          <Link href="/shop" onClick={() => setSidebarOpen(false)} className="hover:text-[#5DA865]">
            Shop
          </Link>

          <Link
            href="/dashboard/chapters-club"
            onClick={() => setSidebarOpen(false)}
            className="hover:text-[#5DA865] flex items-center gap-2"
          >
            <span>Chapters Club</span>
            <span className="inline-flex items-center rounded-full bg-[#E5F7E4] border border-[#5DA865]/30 px-2.5 py-1 text-xs font-semibold text-[#2f6b3a]">
              <strong>Coming Soon</strong> 🚀
            </span>
          </Link>
        </nav>

        <hr className="my-6 border-t border-[#dcd6cf]" />

        {/* ACCOUNT SECTION */}
        {loading ? null : user ? (
          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              className="
                flex items-center gap-3 w-full text-left
                rounded-md px-2 py-2
                transition-colors
                hover:bg-[#f1ede7] hover:text-[#2f6b3a]
              "
            >
              <Image
                src={user.image || "/user_avatar_placeholder.svg"}
                alt="User avatar"
                width={36}
                height={36}
                className="rounded-full border border-[#ccc] object-cover"
              />
              <span className="font-medium text-sm">{user.name || "User"}</span>
            </button>

            {user.loyaltyprogram && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#E5F7E4] px-3 py-1 text-xs font-medium text-[#2f7c3e]">
                <span>Chapters Club</span> 🎉
              </div>
            )}

            {menuOpen && (
              <div className="absolute bottom-12 left-0 bg-white border border-[#dcd6cf] rounded-md py-1 w-44 shadow-sm">
                <Link
                  href="/dashboard/account"
                  onClick={() => {
                    setMenuOpen(false);
                    setSidebarOpen(false);
                  }}
                  className="block px-4 py-2 text-sm hover:bg-[#FAF6F1]"
                >
                  My Account
                </Link>

                <div className="my-1 border-t border-[#eee]" />

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="
                    block w-full text-left px-4 py-2 text-sm
                    text-red-600 hover:bg-[#FAF6F1] hover:text-red-700
                  "
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <Link
              href="/sign-in"
              className="block w-full text-center rounded-md border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)] font-semibold hover:bg-[var(--accent)] hover:text-white transition"
              onClick={() => setSidebarOpen(false)}
            >
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
