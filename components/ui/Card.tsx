"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

/* ------------------------------------------------------
   BASE COMPONENTS YOU ALREADY HAD
------------------------------------------------------ */

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-muted bg-white shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("p-5 border-b border-muted", className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: CardProps) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "p-5 border-t border-muted flex justify-end gap-3",
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------
   NEW COMPONENTS YOU NEED for /admin/page.tsx
------------------------------------------------------ */

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn("p-5 pt-3 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
