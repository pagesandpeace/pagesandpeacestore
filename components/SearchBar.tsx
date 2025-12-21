"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchBar({ defaultValue = "" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(defaultValue);

  function update() {
    const query = new URLSearchParams(params.toString());
    search ? query.set("search", search) : query.delete("search");
    query.set("page", "1");
    router.push(`/shop?${query.toString()}`);
  }

  return (
    <input
      type="text"
      placeholder="Search books, coffee, merch…"
      className="w-full md:w-80 px-4 py-2 rounded-md border bg-white"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && update()}
    />
  );
}
