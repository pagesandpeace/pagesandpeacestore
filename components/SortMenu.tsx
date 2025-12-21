"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function SortMenu({ defaultSort }: { defaultSort: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(sort: string) {
    const query = new URLSearchParams(params.toString());
    query.set("sort", sort);
    router.push(`/shop?${query.toString()}`);
  }

  return (
    <select
      className="px-3 py-2 rounded-md border bg-white"
      defaultValue={defaultSort}
      onChange={(e) => update(e.target.value)}
    >
      <option value="newest">Newest</option>
      <option value="price-asc">Price: Low → High</option>
      <option value="price-desc">Price: High → Low</option>
      <option value="az">A → Z</option>
    </select>
  );
}
