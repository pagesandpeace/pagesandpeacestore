"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  placeholder?: string;
  debounceMs?: number;
};

export function TableSearch({
  placeholder = "Search…",
  debounceMs = 300,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(searchParams.get("q") ?? "");

  // prevents effect running on mount
  const hasInteracted = useRef(false);

  useEffect(() => {
    if (!hasInteracted.current) return;

    const timeout = setTimeout(() => {
      // ⬇️ read searchParams at execution time, not as a dependency
      const params = new URLSearchParams(window.location.search);

      if (value.trim()) {
        params.set("q", value.trim());
        params.set("page", "1");
      } else {
        params.delete("q");
        params.set("page", "1");
      }

      router.replace(`?${params.toString()}`, {
        scroll: false,
      });
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [value, debounceMs, router]); // ✅ searchParams REMOVED

  return (
    <input
      value={value}
      onChange={(e) => {
        hasInteracted.current = true;
        setValue(e.target.value);
      }}
      placeholder={placeholder}
      className="w-full border border-muted rounded-md px-3 py-2 text-sm bg-background"
    />
  );
}
