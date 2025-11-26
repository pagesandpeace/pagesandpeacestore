"use client";

import Link from "next/link";

const productTypes = [
  {
    label: "Blind-Date Book",
    description:
      "Wrapped mystery books with trinkets (theme, items, colour, difficulty)",
    href: "/admin/products/new/blind-date",
  },
  {
    label: "Book",
    description: "Author, format, language, ISBN",
    href: "/admin/products/new/book",
  },
  {
    label: "Coffee",
    description: "Weight, roast, grind, origin",
    href: "/admin/products/new/coffee",
  },
  {
    label: "Merch",
    description: "Apparel, mugs, stationery, accessories",
    href: "/admin/products/new/merch",
  },
  {
    label: "Subscription Box",
    description: "Recurring monthly boxes (e.g. Book Box)",
    href: "/admin/products/new/subscription",
  },
  {
    label: "General Product",
    description: "Simple physical item with price + stock",
    href: "/admin/products/new/general",
  },
];

export default function ProductTypeSelection() {
  return (
    <main className="max-w-4xl mx-auto py-12 font-[Montserrat]">
      <h1 className="text-3xl font-bold mb-2">Create Product</h1>
      <p className="text-gray-600 mb-10">
        What type of product would you like to create?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {productTypes.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="border rounded-xl p-6 hover:shadow-lg transition bg-white"
          >
            <h2 className="text-xl font-semibold">{t.label}</h2>
            <p className="text-gray-500 mt-2">{t.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
