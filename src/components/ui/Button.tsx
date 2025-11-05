"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "neutral";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // ---- Base ----
          "font-semibold rounded-full transition-all duration-200 font-[Montserrat]",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          "disabled:opacity-60 disabled:cursor-not-allowed",

          // ---- Variants ----
          {
            // 🟢 Primary: Green fill, gold border, white text
            "bg-[var(--accent)] text-[var(--background)] border-2 border-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--background)] focus:ring-[var(--secondary)]":
              variant === "primary",

            // 🟡 Outline: Transparent bg, gold border, gold text
            "bg-transparent border-2 border-[var(--secondary)] text-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--background)] focus:ring-[var(--secondary)]":
              variant === "outline",

            // 🌿 Ghost: Transparent, accent text → gold on hover
            "bg-transparent text-[var(--accent)] hover:text-[var(--secondary)] focus:ring-[var(--secondary)]":
              variant === "ghost",

            // ⚪ Neutral: Subtle gray border (for “Back” or secondary actions)
            "bg-transparent border-2 border-[var(--muted)] text-[var(--foreground)] hover:bg-[#f0ece7] focus:ring-[var(--muted)]":
              variant === "neutral",
          },

          // ---- Sizes ----
          {
            "px-3 py-1.5 text-sm": size === "sm",
            "px-5 py-2.5 text-base": size === "md",
            "px-6 py-3 text-lg": size === "lg",
          },

          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
