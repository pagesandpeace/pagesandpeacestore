"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function BackLink({
  href,
  label = "Back"
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link href={href} className="inline-block">
      <Button
        variant="ghost"
        className="flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}
