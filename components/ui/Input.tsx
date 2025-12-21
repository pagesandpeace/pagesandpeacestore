"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid ? "true" : undefined}
        className={cn(
          "w-full rounded-md bg-white px-4 py-3 text-[#111] placeholder:text-[#777] outline-none",
          "border",
          invalid
            ? "border-red-500 focus:ring-2 focus:ring-red-200"
            : "border-[#ccc] focus:ring-2 focus:ring-[var(--accent)]/30",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
