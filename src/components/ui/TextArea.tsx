"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <textarea
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

TextArea.displayName = "TextArea";
