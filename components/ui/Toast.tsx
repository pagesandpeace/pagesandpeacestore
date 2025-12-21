"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "fixed right-4 top-4 z-50 w-full max-w-sm rounded-md shadow-lg pointer-events-auto flex items-start gap-3 p-4 font-[Montserrat]",
  {
    variants: {
      variant: {
        default:
          "bg-white text-[#111] border border-[#ddd]",
        destructive:
          "bg-red-600 text-white border border-red-700",
        success:
          "bg-[var(--accent)] text-white border border-[var(--accent)]/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function Toast({
  title,
  description,
  action,
  variant,
  className,
  ...props
}: ToastProps) {
  return (
    <div className={cn(toastVariants({ variant }), className)} {...props}>
      <div className="flex flex-col flex-1">
        {title && <strong className="text-sm font-semibold">{title}</strong>}
        {description && <p className="text-sm opacity-80">{description}</p>}
      </div>

      {action ? (
        <div className="ml-3 flex-shrink-0">{action}</div>
      ) : null}
    </div>
  );
}
