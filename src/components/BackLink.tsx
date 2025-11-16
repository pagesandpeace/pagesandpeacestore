"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface BackLinkProps {
  href: string;
  label?: string;
  className?: string;
}

export default function BackLink({ href, label = "Back", className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 text-[var(--accent)] hover:opacity-80 transition ${className}`}
    >
      <ArrowLeft size={18} />
      <span>{label}</span>
    </Link>
  );
}
