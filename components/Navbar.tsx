"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useUser } from "@/hooks/useUser";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Book Reviews", href: "/book-reviews" },
  { label: "Visit", href: "/visit" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false); const { user, loading } = useUser(); const [eventQty, setEventQty] = useState(0);
  useEffect(() => { const refresh=()=>{try{setEventQty((JSON.parse(window.localStorage.getItem("app_core_event_basket_v1")??"[]") as {quantity:number}[]).reduce((t,i)=>t+i.quantity,0));}catch{setEventQty(0);}};refresh();window.addEventListener("app-core-basket-changed",refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener("app-core-basket-changed",refresh);window.removeEventListener("storage",refresh);};},[]);
  const closeMenu=()=>setOpen(false); const accountHref=user?.role==="admin"?"/admin":"/dashboard";
  return <header className="sticky top-0 z-50 bg-white shadow-sm"><nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><button onClick={()=>setOpen(!open)} className="p-2 md:hidden" aria-label={open?"Close menu":"Open menu"}>{open?<XMarkIcon className="h-6 w-6"/>:<Bars3Icon className="h-6 w-6"/>}</button><Link href="/" className="flex items-center"><Image src="/p&p_logo_cream.svg" alt="Pages & Peace" width={0} height={0} sizes="64px" priority className="block h-10 w-auto"/></Link><div className="flex items-center gap-4"><Link href="/events/checkout" className="relative" aria-label="Event basket"><span className="text-lg">🛒</span>{eventQty>0&&<span className="absolute -right-3 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-xs">{eventQty}</span>}</Link>{!loading&&(user?<Link href={accountHref} className="hidden md:inline-block">My Account</Link>:<Link href="/sign-in" className="hidden md:inline-block">Sign In</Link>)}</div><ul className="absolute left-1/2 hidden -translate-x-1/2 gap-6 md:flex">{NAV_LINKS.map(l=><li key={l.href}><Link href={l.href} className="hover:text-gray-500">{l.label}</Link></li>)}</ul></nav>{open&&<><button className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={closeMenu} aria-label="Close menu"/><div className="relative z-50 rounded-b-xl bg-[var(--accent)] p-4 shadow-lg md:hidden"><ul className="space-y-1">{NAV_LINKS.map(l=><li key={l.href}><Link href={l.href} onClick={closeMenu} className="block px-3 py-2">{l.label}</Link></li>)}{!loading&&(user?<Link href={accountHref} onClick={closeMenu} className="block px-3 py-2">My Account</Link>:<Link href="/sign-in" onClick={closeMenu} className="block px-3 py-2">Sign In</Link>)}</ul></div></>}</header>;
}
