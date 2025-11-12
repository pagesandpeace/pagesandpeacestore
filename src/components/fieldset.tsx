"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Field({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & { requiredMark?: boolean };

export function Label({ className, children, requiredMark, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "block text-xs uppercase tracking-wide font-medium text-[#777]",
        className
      )}
      {...props}
    >
      {children}
      {requiredMark && <span aria-hidden className="text-red-600 ml-1">*</span>}
    </label>
  );
}

export function ErrorMessage({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      role="alert"
      aria-live="polite"
      className={cn("text-sm text-red-600", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function Hint({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-[#6b6b6b]", className)} {...props}>
      {children}
    </p>
  );
}
