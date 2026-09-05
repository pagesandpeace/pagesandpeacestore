"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";

export type UserProfile = { id: string; auth_user_id: string; email: string | null; name: string | null; image: string | null; role: "admin" | "customer"; };

export default function AdminSidebar({ user, profile }: { user: User; profile: UserProfile }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  async function signOut() { await fetch("/auth/signout", { method: "POST" }); window.dispatchEvent(new Event("pp:auth-updated")); router.push("/sign-in"); }
  const nav = [
    { label: "Dashboard", href: "/admin" },
    { label: "Events", href: "/admin/events" },
    { label: "Event bookings", href: "/admin/events/bookings" },
    { label: "Users", href: "/admin/users" },
  ];

  return <aside className="fixed left-0 top-0 z-50 flex min-h-dvh w-64 flex-col justify-between border-r border-[#dcd6cf] bg-[#FAF6F1]">
    <div className="px-6 pt-10">
      <button onClick={() => router.push("/admin")} className="flex items-center justify-center" aria-label="Admin dashboard"><Image src="/p&p_logo_cream.svg" alt="Pages & Peace Logo" width={100} height={100} /></button>
      <nav className="mt-8 flex flex-col gap-3 text-sm"><p className="text-xs uppercase tracking-wider text-gray-500">Rebuild admin</p>{nav.map((item) => <button key={item.href} onClick={() => router.push(item.href)} className="text-left font-medium hover:text-[#5DA865]">{item.label}</button>)}</nav>
    </div>
    <div className="relative border-t border-[#ded7cf] px-6 py-6">
      <button onClick={() => setMenuOpen((open) => !open)} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-[#f1ede7]"><Image src={profile.image ?? "/user_avatar_placeholder.svg"} alt="" width={36} height={36} className="rounded-full border object-cover" /><div className="min-w-0"><p className="truncate text-sm font-medium">{profile.name || user.email || "Admin"}</p><span className="mt-1 inline-block rounded-full border border-red-300 bg-red-200 px-2 py-0.5 text-xs text-red-700">Admin</span></div></button>
      {menuOpen ? <div className="absolute bottom-[106px] left-6 w-44 rounded-md border bg-white shadow"><button onClick={() => router.push("/admin/account")} className="block w-full px-4 py-2 text-left text-sm hover:bg-[#FAF6F1]">My account</button><button onClick={signOut} className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-[#FAF6F1]">Sign out</button></div> : null}
    </div>
  </aside>;
}
