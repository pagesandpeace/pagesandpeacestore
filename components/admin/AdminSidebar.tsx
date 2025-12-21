"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";

export default function AdminSidebar() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNav = (href: string) => {
    router.push(href);
  };

  const handleSignOut = async () => {
    await fetch("/auth/signout", { method: "POST" });
    window.dispatchEvent(new Event("pp:auth-updated"));
    router.push("/sign-in");
  };

  if (loading) return null;

  return (
    <aside
      className="
        fixed top-0 left-0 z-50
        w-64 min-h-dvh
        bg-[#FAF6F1] border-r border-[#dcd6cf]
        flex flex-col justify-between
      "
    >
      {/* TOP SECTION */}
      <div className="px-6 pt-10">
        {/* LOGO */}
        <button
          onClick={() => handleNav("/admin")}
          className="flex items-center justify-center"
        >
          <Image
            src="/p&p_logo_cream.svg"
            alt="Pages & Peace Logo"
            width={100}
            height={100}
          />
        </button>

        {/* NAVIGATION */}
        <nav className="mt-6 text-sm flex flex-col gap-y-5 max-h-[60vh] overflow-y-auto pr-2 pb-4">

          <button onClick={() => handleNav("/admin")} className="text-left hover:text-[#5DA865]">
            Dashboard
          </button>

          <button onClick={() => handleNav("/admin/events")} className="text-left hover:text-[#5DA865]">
            Events
          </button>

          <button onClick={() => handleNav("/admin/events/new")} className="text-left hover:text-[#5DA865]">
            Create Event
          </button>

          <button onClick={() => handleNav("/admin/products")} className="text-left hover:text-[#5DA865]">
            Products
          </button>

          <button onClick={() => handleNav("/admin/products/new")} className="text-left hover:text-[#5DA865]">
            Add Product
          </button>
          <button onClick={() => handleNav("/admin/orders")} className="text-left hover:text-[#5DA865]">
            View orders
          </button>

          {/* MARKETING SECTION */}
          <div className="pt-3 border-t border-[#dcd6cf]">
            <span className="text-xs uppercase text-gray-500 tracking-wider">
              Marketing
            </span>

            <button
              onClick={() => handleNav("/admin/marketing")}
              className="mt-3 text-left hover:text-[#5DA865]"
            >
              Shop Hero Banner
            </button>
          </div>

          {/* Newsletter Tools */}
          <button
            onClick={() => handleNav("/admin/newsletter")}
            className="text-left hover:text-[#5DA865] mt-5"
          >
            Newsletter Manager
          </button>

          <button
            onClick={() => handleNav("/admin/newsletter/history")}
            className="text-left hover:text-[#5DA865]"
          >
            Blast History
          </button>
        </nav>
      </div>

      {/* BOTTOM ACCOUNT SECTION */}
      <div ref={accountRef} className="border-t border-[#ded7cf] px-6 py-6 bg-[#FAF6F1] relative">
        {user ? (
          <>
            {/* User Profile Button */}
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

              <div className="flex flex-col leading-tight">
                <span className="font-medium text-sm truncate">
                  {user.name || "Admin"}
                </span>

                <span className="mt-1 inline-block bg-red-200 text-red-700 text-xs px-2 py-0.5 rounded-full border border-red-300">
                  Admin
                </span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute bottom-[110px] left-6 bg-white border rounded-md shadow w-44 z-50">
                <button
                  onClick={() => handleNav("/admin/account")}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAF6F1]"
                >
                  My Account
                </button>

                <button
                  onClick={() => handleNav("/admin/settings")}
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
  );
}
