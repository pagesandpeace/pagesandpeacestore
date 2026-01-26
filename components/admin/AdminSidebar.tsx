"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
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

type AdminSidebarProps = {
  user: User;
  profile: UserProfile;
};

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */

export default function AdminSidebar({
  user,
  profile,
}: AdminSidebarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [localProfile, setLocalProfile] =
    useState<UserProfile>(profile);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

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
    return () =>
      document.removeEventListener("mousedown", handler);
  }, []);

  const handleNav = (href: string) => {
    router.push(href);
  };

  const handleSignOut = async () => {
    await fetch("/auth/signout", { method: "POST" });
    window.dispatchEvent(new Event("pp:auth-updated"));
    router.push("/sign-in");
  };

  return (
    <aside
      className="
        fixed top-0 left-0 z-50
        w-64 min-h-dvh
        bg-[#FAF6F1] border-r border-[#dcd6cf]
        flex flex-col justify-between
      "
    >
      {/* TOP */}
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

        {/* NAV */}
        <nav className="mt-8 text-sm flex flex-col gap-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-4">

          {/* CONTENT */}
          <div>
            <span className="text-xs uppercase text-gray-500 tracking-wider">
              Content
            </span>

            <div className="mt-3 flex flex-col gap-3">
              <button
                onClick={() => handleNav("/admin")}
                className="text-left hover:text-[#5DA865]"
              >
                Dashboard
              </button>

              <button
                onClick={() => handleNav("/admin/products")}
                className="text-left hover:text-[#5DA865]"
              >
                Products
              </button>

              <button
                onClick={() => handleNav("/admin/authors")}
                className="text-left hover:text-[#5DA865]"
              >
                Authors
              </button>

              <button
                onClick={() => handleNav("/admin/events")}
                className="text-left hover:text-[#5DA865]"
              >
                Events
              </button>
            </div>
          </div>

          {/* COMMERCE */}
          <div>
            <span className="text-xs uppercase text-gray-500 tracking-wider">
              Commerce
            </span>

            <div className="mt-3 flex flex-col gap-3">
              <button
                onClick={() => handleNav("/admin/orders")}
                className="text-left hover:text-[#5DA865]"
              >
                Online Orders
              </button>
            </div>
          </div>

          {/* OPERATIONS */}
          <div>
            <span className="text-xs uppercase text-gray-500 tracking-wider">
              Operations
            </span>

            <div className="mt-3 flex flex-col gap-3">
              <button
                onClick={() => handleNav("/admin/backorders")}
                className="text-left hover:text-[#5DA865]"
              >
                📚 Sales & Backorders
              </button>

              <button
                onClick={() => handleNav("/admin/supplier-orders")}
                className="text-left hover:text-[#5DA865]"
              >
                📦 Order Status
              </button>

              <button
                onClick={() => handleNav("/admin/operations")}
                className="text-left hover:text-[#5DA865] font-medium"
              >
                🔄 Operations Queue
              </button>

              <button
                onClick={() => handleNav("/admin/food")}
                className="text-left hover:text-[#5DA865] font-medium"
              >
                🍰 Food Ops
              </button>
            </div>
          </div>

          {/* MARKETING */}
          <div>
            <span className="text-xs uppercase text-gray-500 tracking-wider">
              Marketing
            </span>

            <div className="mt-3 flex flex-col gap-3">
              <button
                onClick={() => handleNav("/admin/marketing")}
                className="text-left hover:text-[#5DA865]"
              >
                Shop Hero Banner
              </button>

              <button
                onClick={() => handleNav("/admin/newsletter")}
                className="text-left hover:text-[#5DA865]"
              >
                Newsletter Manager
              </button>

              <button
                onClick={() =>
                  handleNav("/admin/newsletter/history")
                }
                className="text-left hover:text-[#5DA865]"
              >
                Blast History
              </button>
            </div>
          </div>

          {/* DATA */}
          <div>
            <span className="text-xs uppercase text-gray-500 tracking-wider">
              Data
            </span>

            <div className="mt-3 flex flex-col gap-3">
              <button
                onClick={() =>
                  handleNav("/admin/suppliers/gardners")
                }
                className="text-left hover:text-[#5DA865]"
              >
                Gardners Import
              </button>

              <button
                onClick={() =>
                  handleNav(
                    "/admin/suppliers/gardners/catalogue"
                  )
                }
                className="text-left hover:text-[#5DA865]"
              >
                Gardners Catalogue
              </button>

              <button
                onClick={() =>
                  handleNav("/admin/supplier-changes")
                }
                className="text-left hover:text-[#5DA865]"
              >
                Product Catalogue Changes
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* ACCOUNT */}
      <div
        ref={accountRef}
        className="border-t border-[#ded7cf] px-6 py-6 bg-[#FAF6F1] relative"
      >
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 w-full text-left rounded-md px-2 py-2 hover:bg-[#f1ede7]"
        >
          <Image
            src={
              localProfile.image ??
              "/user_avatar_placeholder.svg"
            }
            alt="User avatar"
            width={36}
            height={36}
            className="rounded-full border object-cover"
          />

          <div className="flex flex-col leading-tight">
            <span className="font-medium text-sm truncate">
              {localProfile.name ||
                user.email ||
                "Admin"}
            </span>

            <span className="mt-1 inline-block bg-red-200 text-red-700 text-xs px-2 py-0.5 rounded-full border border-red-300">
              Admin
            </span>
          </div>
        </button>

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
      </div>
    </aside>
  );
}
