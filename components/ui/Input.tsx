"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, type, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    // Merge forwarded ref + local ref
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    return (
      <input
        ref={inputRef}
        type={type}
        aria-invalid={invalid ? "true" : undefined}
        className={cn(
          "w-full rounded-md bg-white px-4 py-3 text-[#111] placeholder:text-[#777] outline-none",
          "border",
          invalid
            ? "border-red-500 focus:ring-2 focus:ring-red-200"
            : "border-[#ccc] focus:ring-2 focus:ring-[var(--accent)]/30",
          className
        )}
        // 🚫 Prevent mouse wheel changing number inputs
        onWheel={(e) => {
          if (type === "number") {
            e.currentTarget.blur();
          }
        }}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
