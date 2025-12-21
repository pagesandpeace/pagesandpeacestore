"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function NewProductRouterPage() {
  const router = useRouter();
  const [type, setType] = useState("");

  function handleContinue() {
    if (!type) return;
    router.push(`/admin/products/new/${type}`);
  }

  return (
    <div className="max-w-xl mx-auto py-16 space-y-6">
      <h1 className="text-3xl font-bold">Create a new product</h1>

      <select
        className="border rounded-md px-3 py-2 w-full"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="">Select product type…</option>
        <option value="book">Book</option>
        <option value="merch">Merch</option>
        <option value="blind-date">Blind Date with a Book</option>
        <option value="other">Other</option>
      </select>

      <Button variant="primary" onClick={handleContinue} disabled={!type}>
        Continue
      </Button>
    </div>
  );
}
