"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function StockFilter({ defaultChecked }: { defaultChecked: boolean }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(checked: boolean) {
    const query = new URLSearchParams(params.toString());
    checked ? query.set("inStock", "1") : query.delete("inStock");
    router.push(`/shop?${query.toString()}`);
  }

  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        onChange={(e) => update(e.target.checked)}
      />
      <span className="text-sm">In Stock Only</span>
    </label>
  );
}
