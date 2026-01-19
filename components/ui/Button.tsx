"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "neutral";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          // Base
          "font-semibold rounded-full transition-all duration-200 font-[Montserrat]",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          "disabled:opacity-60 disabled:cursor-not-allowed",

          // Variants
          {
            "bg-[var(--accent)] text-[var(--background)] border-2 border-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--background)] focus:ring-[var(--secondary)]":
              variant === "primary",

            "bg-transparent border-2 border-[var(--secondary)] text-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--background)] focus:ring-[var(--secondary)]":
              variant === "outline",

            "bg-transparent text-[var(--accent)] hover:text-[var(--secondary)] focus:ring-[var(--secondary)]":
              variant === "ghost",

            "bg-transparent border-2 border-[var(--muted)] text-[var(--foreground)] hover:bg-[#f0ece7] focus:ring-[var(--muted)]":
              variant === "neutral",
          },

          // Sizes
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
