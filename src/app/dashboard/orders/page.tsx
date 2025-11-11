import ComingSoon from "@/components/ComingSoon";

export const metadata = {
  title: "My Orders | Pages & Peace",
  description: "Track your purchases and order history.",
  robots: { index: false, follow: false }, // not indexable until live
};

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-6 md:px-8 py-12 md:py-16">
      <section className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-2 border-b border-[#dcd6cf] pb-6 md:flex-row md:items-end md:justify-between">
          <h1 className="text-3xl font-semibold tracking-widest">My Orders 📦</h1>
          <p className="text-[#111]/70 text-sm">
            Your order history will appear here once this feature goes live.
          </p>
        </header>

        <ComingSoon
          title="Orders are almost ready"
          description="You’ll soon be able to view your purchases, track delivery, and download receipts right here."
          actions={[
            { label: "Browse the shop", href: "/shop" },
            { label: "Back to account", href: "/dashboard" },
          ]}
        />

        <div className="rounded-xl border border-[#e0dcd6] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e0dcd6] bg-[#FAF6F1] px-6 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#111]/80">
              Layout preview (placeholder)
            </h2>
            <span className="text-xs text-[#111]/60">No live data shown</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#FAF6F1] text-[#111]/80 text-sm uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 border-b border-[#e0dcd6]">Order ID</th>
                  <th className="px-6 py-3 border-b border-[#e0dcd6]">Date</th>
                  <th className="px-6 py-3 border-b border-[#e0dcd6]">Total</th>
                  <th className="px-6 py-3 border-b border-[#e0dcd6]">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="hover:bg-[#FAF6F1]/60 transition-colors">
                    <td className="px-6 py-4 text-[#111]/40">—</td>
                    <td className="px-6 py-4 text-[#111]/40">—</td>
                    <td className="px-6 py-4 text-[#111]/40">—</td>
                    <td className="px-6 py-4 text-[#111]/40">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#e0dcd6] px-6 py-4 text-sm text-[#111]/70">
            This is a visual preview only. No order data is stored or displayed here yet.
          </div>
        </div>
      </section>
    </main>
  );
}
