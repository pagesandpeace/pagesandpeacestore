"use client";

import Image from "next/image";

interface HeaderProps {
  variant?: "dashboard" | "marketing";
  onMenuToggle?: () => void;
}

export default function Header({ variant = "dashboard", onMenuToggle }: HeaderProps) {
  if (variant !== "dashboard") return null; // Only show in dashboard view

  return (
    <header
      className="
        fixed top-0 left-0 right-0 z-40
        flex items-center justify-between
        bg-[#FAF6F1]/95 backdrop-blur-sm
        border-b border-[#dcd6cf]
        px-4 sm:px-6 py-2.5 md:hidden
      "
    >
      {/* 🍔 Burger Menu (left) */}
      <button
        onClick={onMenuToggle}
        aria-label="Toggle sidebar"
        className="flex items-center justify-center p-2 rounded-md focus:outline-none"
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
        }}
      >
        <div className="space-y-1.5">
          <span className="block w-6 h-[2px] bg-[#111]" />
          <span className="block w-6 h-[2px] bg-[#111]" />
          <span className="block w-6 h-[2px] bg-[#111]" />
        </div>
      </button>

      {/* 🌿 Logo (right) */}
      <div className="flex items-center justify-center">
        <Image
          src="/p&p_logo_cream.svg"
          alt="Pages & Peace logo"
          width={70}    // ⬅️ Increased from 48 → 70
          height={70}   // ⬅️ Increased height for better visibility
          priority
          className="object-contain bg-transparent !bg-none !shadow-none"
          style={{
            maxHeight: "56px",   // ⬅️ ensures header doesn't expand
            height: "auto",
            width: "auto",
          }}
        />
      </div>
    </header>
  );
}
