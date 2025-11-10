"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Chapters Club", href: "/chapters-club" },
  { label: "Contact", href: "/contact" },
];

export default function DropdownMenu() {
  const [open, setOpen] = useState(false);

  // Explicitly type dropdownRef as HTMLDivElement
  const dropdownRef = useRef<HTMLDivElement>(null); 

  // Close the dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false); // Close dropdown if clicked outside
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside); // Clean up listener
    };
  }, []);

  return (
    <div className="absolute top-16 left-0 w-full bg-light-green-100 border-t border-gray-200" ref={dropdownRef}>
      <button
        type="button"
        className="inline-flex items-center justify-center p-2 w-full bg-white"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="block w-6 h-0.5 bg-gray-800"></span>
        <span className="block w-6 h-0.5 bg-gray-800"></span>
        <span className="block w-6 h-0.5 bg-gray-800"></span>
      </button>

      {/* Dropdown Links */}
      {open && (
        <div className="absolute top-16 left-0 w-full bg-light-green border-t border-gray-200">
          <ul className="space-y-2 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block py-2 text-gray-800 hover:text-gray-600"
                  onClick={() => setOpen(false)} // Close menu after clicking
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
