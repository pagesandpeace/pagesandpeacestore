"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeColor =
  | "green"
  | "red"
  | "blue"
  | "yellow"
  | "neutral"
  | "purple"; // ⭐ added

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

export function Badge({ children, color = "neutral", className }: BadgeProps) {
  const classes: Record<BadgeColor, string> = {
    green: "bg-green-200 text-green-800",
    red: "bg-red-200 text-red-800",
    blue: "bg-blue-200 text-blue-800",
    yellow: "bg-yellow-200 text-yellow-800",
    neutral: "bg-gray-200 text-gray-800",
    purple: "bg-purple-200 text-purple-800", // ⭐ added
  };

  return (
    <span
      className={cn(
        "px-2 py-1 rounded text-xs font-medium",
        classes[color],
        className
      )}
    >
      {children}
    </span>
  );
}
