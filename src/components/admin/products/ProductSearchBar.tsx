"use client";

import { useState, useEffect } from "react";

export default function ProductSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);

  // Debounce 400ms
  useEffect(() => {
    const t = setTimeout(() => onChange(local), 400);
    return () => clearTimeout(t);
  }, [local]);

  return (
    <input
      className="border p-2 rounded w-72"
      placeholder="Search products…"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
    />
  );
}
