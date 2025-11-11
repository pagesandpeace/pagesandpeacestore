// src/components/BackLink.tsx
"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type BackLinkProps = { className?: string };

function BackLinkInner({ className = "" }: BackLinkProps) {
  const params = useSearchParams();
  const router = useRouter();
  const from = params.get("from");

  const label = from === "account" ? "← Back to Account" : "← Back to Home";
  const href = from === "account" ? "/dashboard" : "/";

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <div className="mb-6">
      <Link
        href={href}
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-100 ${className}`}
        aria-label={label}
      >
        {label}
      </Link>
    </div>
  );
}

export default function BackLink(props: BackLinkProps) {
  return (
    <Suspense fallback={null}>
      <BackLinkInner {...props} />
    </Suspense>
  );
}
