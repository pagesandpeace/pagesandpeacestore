export const dynamic = "force-dynamic";
import ComingSoon from "@/components/ComingSoon";
import { getCurrentUserServer } from "@/lib/auth/actions";
import { getVoucherOrders } from "@/lib/data/getVoucherOrders";
import { getStoreOrders } from "@/lib/data/getStoreOrders";
import { redirect } from "next/navigation";

/* -------------------- SHARED ORDER TYPES -------------------- */
type VoucherOrder = {
  id: string;
  type: "voucher";
  code: string;
  total: number;
  remaining: number;
  currency: string;
  created_at: string | Date;
  status: string;
  receipt: string;
};

type StoreOrder = {
  id: string;
  type: "store";
  created_at: string | Date | null;
  total: number;
  status: string;
  items: {
    productName: string | null;
    quantity: number;
  }[];
  itemCount: number;
  receipt: string;
};

type AnyOrder = VoucherOrder | StoreOrder;

export const metadata = {
  title: "My Orders | Pages & Peace",
  description: "Track your purchases and order history.",
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  // ✔ Server-only auth call (correct)
  const user = await getCurrentUserServer();

  // 🔒 If not logged in → not allowed to see orders
  if (!user) redirect("/sign-in?callbackURL=/dashboard/orders");

  // 🔍 Fetch voucher & store orders
  const voucherOrders: VoucherOrder[] =
    user.email ? await getVoucherOrders(user.email) : [];

  const storeOrders: StoreOrder[] =
    user.id ? await getStoreOrders(user.id) : [];

  // 🔄 Combine and sort
  const allOrders: AnyOrder[] = [...voucherOrders, ...storeOrders].sort(
    (a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    }
  );

  const hasAnyOrders = allOrders.length > 0;

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-6 md:px-8 py-12 md:py-16">
      <section className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-2 border-b border-[#dcd6cf] pb-6 md:flex-row md:items-end md:justify-between">
          <h1 className="text-3xl font-semibold tracking-widest">My Orders 📦</h1>
          <p className="text-[#111]/70 text-sm">
            View your purchases and voucher activity.
          </p>
        </header>

        {/* IF NO ORDERS */}
        {!hasAnyOrders && (
          <ComingSoon
            title="No orders yet"
            description="Your purchases will appear here."
            actions={[
              { label: "Browse the shop", href: "/shop" },
              { label: "Back to account", href: "/dashboard" },
            ]}
          />
        )}

        {/* IF THERE ARE ORDERS */}
        {hasAnyOrders && (
          <div className="rounded-xl border border-[#e0dcd6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e0dcd6] bg-[#FAF6F1] px-6 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#111]/80">
                Your Purchases
              </h2>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[#FAF6F1] text-[#111]/80 text-sm uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-3 border-b border-[#e0dcd6]">Type</th>
                    <th className="px-6 py-3 border-b border-[#e0dcd6]">Date</th>
                    <th className="px-6 py-3 border-b border-[#e0dcd6]">Details</th>
                    <th className="px-6 py-3 border-b border-[#e0dcd6]">Amount</th>
                    <th className="px-6 py-3 border-b border-[#e0dcd6]">Status</th>
                    <th className="px-6 py-3 border-b border-[#e0dcd6]">Receipt</th>
                  </tr>
                </thead>

                <tbody className="text-sm">
                  {allOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#FAF6F1]/50 transition-colors">
                      <td className="px-6 py-4">
                        {o.type === "voucher" ? "Gift Voucher" : "Order"}
                      </td>

                      <td className="px-6 py-4">
                        {o.created_at
                          ? new Date(o.created_at).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="px-6 py-4">
                        {"code" in o
                          ? `Code: ${o.code}`
                          : `${o.itemCount} item${o.itemCount === 1 ? "" : "s"}`}
                      </td>

                      <td className="px-6 py-4">£{o.total.toFixed(2)}</td>

                      <td className="px-6 py-4 capitalize">{o.status}</td>

                      <td className="px-6 py-4">
                        <a
                          href={o.receipt}
                          className="underline text-[var(--accent)]"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE LIST */}
            <div className="md:hidden px-4 py-4 divide-y divide-[#e0dcd6]">
              {allOrders.map((o) => (
                <div key={o.id} className="py-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">
                      {o.type === "voucher" ? "Gift Voucher" : "Order"}
                    </span>
                    <span className="text-xs text-[#111]/60">
                      {o.created_at
                        ? new Date(o.created_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>

                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-semibold">Details:</span>{" "}
                      {"code" in o
                        ? `Code ${o.code}`
                        : `${o.itemCount} item${o.itemCount === 1 ? "" : "s"}`}
                    </p>

                    <p>
                      <span className="font-semibold">Total:</span> £
                      {o.total.toFixed(2)}
                    </p>

                    <p className="capitalize">
                      <span className="font-semibold">Status:</span> {o.status}
                    </p>

                    <a
                      href={o.receipt}
                      className="inline-block mt-1 underline text-[var(--accent)]"
                    >
                      View Receipt
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
