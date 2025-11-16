"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { signOut } from "@/lib/auth/actions";
import { useUser } from "@/lib/auth/useUser";

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  handleNav: (href: string) => void;
};

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  handleNav,
}: SidebarProps) {
  const { user, loading } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

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

  const handleSignOut = async () => {
    await signOut();
    handleNav("/");
  };

  return (
    <>
      {/* MOBILE BACKDROP */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-[#FAF6F1] border-r border-[#dcd6cf] 
        flex flex-col justify-between 
        transition-transform duration-300 
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        md:translate-x-0`}
      >
        {/* TOP SECTION */}
        <div className="px-6 pt-10">

          {/* Close button (mobile) */}
          <button
            className="md:hidden absolute right-3 top-3 p-2 hover:bg-black/5 rounded"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-6 w-6 text-gray-800" />
          </button>

          {/* Logo */}
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

          {/* NAVIGATION — now scrollable */}
          <div className="mt-6 text-sm max-h-[60vh] overflow-y-auto pr-2 pb-4">
            <nav className="flex flex-col gap-y-5">

              <button onClick={() => handleNav("/dashboard")} className="text-left hover:text-[#5DA865]">
                Dashboard
              </button>

              <button onClick={() => handleNav("/dashboard/events")} className="text-left hover:text-[#5DA865]">
                Events
              </button>

              <button onClick={() => handleNav("/dashboard/orders")} className="text-left hover:text-[#5DA865]">
                Orders
              </button>

              <button onClick={() => handleNav("/shop")} className="text-left hover:text-[#5DA865]">
                Shop
              </button>

              <button
                onClick={() => handleNav("/dashboard/chapters-club")}
                className="text-left hover:text-[#5DA865] flex items-center gap-2"
              >
                <span>Chapters Club</span>
                <span className="bg-[#E5F7E4] text-[#2f6b3a] rounded-full border px-2.5 py-1 text-xs font-semibold">
                  Coming Soon 🚀
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* BOTTOM ACCOUNT SECTION — FIXED ALWAYS */}
        <div ref={accountRef} className="border-t border-[#ded7cf] px-6 py-6 bg-[#FAF6F1]">
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

                <div className="flex flex-col">
                  <span className="font-medium text-sm">{user.name || "User"}</span>

                  {user.loyaltyprogram && (
                    <span className="mt-1 inline-block text-xs bg-[#5DA865] text-white px-2 py-0.5 rounded-full">
                      Loyalty Member ⭐
                    </span>
                  )}
                </div>
              </button>

              {menuOpen && (
                <div className="absolute bottom-20 left-6 bg-white border rounded-md shadow p-1 w-44">

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
            </>
          ) : (
            <button
              onClick={() => handleNav("/sign-in")}
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
