"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { signOut } from "@/lib/auth/actions";
import { useUser } from "@/lib/auth/useUser";
import { useRouter } from "next/navigation";

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
};

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const { user, loading } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const accountRef = useRef<HTMLDivElement | null>(null);

  /* ---------------------------------------------
     CLOSE ACCOUNT DROPDOWN WHEN CLICKING OUTSIDE
  ---------------------------------------------- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ---------------------------------------------
     SIGN OUT
  ---------------------------------------------- */
  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  /* ---------------------------------------------
     MOBILE CLOSE HANDLER
  ---------------------------------------------- */
  const handleMobileNavigate = (path: string) => {
    setSidebarOpen(false);
    router.push(path);
  };

  /* ---------------------------------------------
     UI
  ---------------------------------------------- */
  return (
    <>
      {/* MOBILE OVERLAY */}
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
        {/* Close button (mobile only) */}
        <button
          className="md:hidden absolute right-3 top-3 p-2 hover:bg-black/5 rounded"
          onClick={() => setSidebarOpen(false)}
        >
          <XMarkIcon className="h-6 w-6 text-gray-800" />
        </button>

        {/* Logo */}
        <button
          onClick={() => handleMobileNavigate("/dashboard")}
          className="flex items-center justify-center"
        >
          <Image
            src="/p&p_logo_cream.svg"
            alt="Pages & Peace logo"
            width={100}
            height={100}
          />
        </button>

        {/* MAIN NAVIGATION */}
        <div className="flex-1 overflow-y-auto pb-32 mt-6 text-sm">
          <nav className="flex flex-col gap-y-5">

            <button
              className="text-left hover:text-[#5DA865]"
              onClick={() => handleMobileNavigate("/dashboard")}
            >
              Dashboard
            </button>

            <button
              className="text-left hover:text-[#5DA865]"
              onClick={() => handleMobileNavigate("/dashboard/events")}
            >
              Events
            </button>

            <button
              className="text-left hover:text-[#5DA865]"
              onClick={() => handleMobileNavigate("/dashboard/orders")}
            >
              Orders
            </button>

            <button
              className="text-left hover:text-[#5DA865]"
              onClick={() => handleMobileNavigate("/dashboard/settings")}
            >
              Settings
            </button>

            <button
              className="text-left hover:text-[#5DA865]"
              onClick={() => handleMobileNavigate("/shop")}
            >
              Shop
            </button>

            {/* Chapters Club */}
            <button
              className="text-left hover:text-[#5DA865] flex items-center gap-2"
              onClick={() => handleMobileNavigate("/dashboard/chapters-club")}
            >
              <span>Chapters Club</span>
              <span className="bg-[#E5F7E4] text-[#2f6b3a] rounded-full border px-2.5 py-1 text-xs font-semibold">
                Coming Soon 🚀
              </span>
            </button>
          </nav>
        </div>

        {/* ACCOUNT SECTION */}
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
                  <button
                    onClick={() => handleMobileNavigate("/dashboard/account")}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAF6F1]"
                  >
                    My Account
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
              onClick={() => handleMobileNavigate("/sign-in")}
              className="block w-full text-center px-4 py-2 border rounded-md text-[#5DA865] border-[#5DA865] hover:bg-[#5DA865] hover:text-white"
            >
              Sign in
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
