"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setUserImage(user?.image || null);
    } catch (err) {
      console.error("❌ Failed to fetch user for sidebar:", err);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <aside
      className={`
        fixed top-0 left-0 z-50 h-full w-64
        flex flex-col justify-between
        bg-[#FAF6F1] border-r border-[#dcd6cf]
        px-6 py-10
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static
      `}
    >
      <div className="flex flex-col gap-y-10">
        {/* Logo */}
        <button
          onClick={() => router.push("/dashboard")}
          aria-label="Go to dashboard"
          className="flex items-center justify-center focus:outline-none"
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

        {/* Nav links */}
        <nav className="flex flex-col gap-y-5 text-sm">
          {[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/dashboard/orders", label: "Orders" },
            { href: "/dashboard/account/security", label: "Security" },
            { href: "/dashboard/settings", label: "Settings" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setSidebarOpen(false)}
              className="hover:text-[#5DA865] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Account dropdown */}
      <div className="relative mt-8">
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-3 w-full text-left hover:opacity-90"
        >
          <Image
            src={userImage || "/user_avatar_placeholder.svg"}
            alt="User avatar"
            width={36}
            height={36}
            className="rounded-full border border-[#ccc] object-cover"
          />
          <span className="font-medium text-sm">Account</span>
        </button>

        {menuOpen && (
          <div className="absolute bottom-12 left-0 bg-white border border-[#dcd6cf] rounded-md py-2 w-44 shadow-sm">
            <Link
              href="/dashboard/account"
              onClick={() => {
                setMenuOpen(false);
                setSidebarOpen(false);
              }}
              className="block px-4 py-2 text-sm hover:bg-[#FAF6F1] transition"
            >
              My Account
            </Link>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
