"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => {
  return (
    <select
      ref={ref}
      aria-invalid={invalid ? "true" : undefined}
      className={cn(
        "w-full rounded-md bg-white px-4 py-3 text-[#111]",
        "border outline-none appearance-none bg-[url('/icons/chevron-down.svg')] bg-no-repeat bg-right bg-[length:16px]",
        invalid
          ? "border-red-500 focus:ring-2 focus:ring-red-200"
          : "border-[#ccc] focus:ring-2 focus:ring-[var(--accent)]/30",
        className
      )}
      {...props}
    />
  );
});

Select.displayName = "Select";
