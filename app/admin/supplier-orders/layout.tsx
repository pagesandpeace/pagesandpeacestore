"use client";

import { usePathname } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SupplierOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Supplier Orders</h1>

      <nav className="flex gap-2 border-b pb-2">
        <Tab
          href="/admin/supplier-orders/to-order"
          label="To be ordered"
          active={pathname.startsWith("/admin/supplier-orders/to-order")}
        />
        <Tab
          href="/admin/supplier-orders/awaiting-delivery"
          label="Awaiting delivery"
          active={pathname.startsWith(
            "/admin/supplier-orders/awaiting-delivery"
          )}
        />
        <Tab
          href="/admin/supplier-orders/delivered"
          label="Delivered"
          active={pathname.startsWith(
            "/admin/supplier-orders/delivered"
          )}
        />
        <Tab
          href="/admin/supplier-orders/closed"
          label="Closed"
          active={pathname.startsWith("/admin/supplier-orders/closed")}
        />
      </nav>

      {children}
    </div>
  );
}

function Tab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <a
      href={href}
      className={[
        "px-3 py-2 text-sm border-b-2 transition",
        active
          ? "border-black text-black font-medium"
          : "border-transparent text-gray-500 hover:text-black hover:border-black",
      ].join(" ")}
    >
      {label}
    </a>
  );
}
