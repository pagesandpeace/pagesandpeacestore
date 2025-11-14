import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { vouchers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Disable index
export const metadata = {
  robots: { index: false, follow: false },
  title: "Voucher",
};

// ✅ CLEAN, SIMPLE, SAFE PARAM TYPE
export default async function VoucherPublicPage({
  params,
}: {
  params: { code: string };
}) {
  const code = decodeURIComponent(params.code).toUpperCase();

  const [v] = await db
    .select()
    .from(vouchers)
    .where(eq(vouchers.code, code))
    .limit(1);

  if (!v) notFound();

  const currency = (v.currency || "GBP").toUpperCase();
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "";
  const remaining = `${symbol}${(v.amountRemainingPence / 100).toFixed(2)}`;
  const initial = `${symbol}${(v.amountInitialPence / 100).toFixed(2)}`;
  const exp = v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : "—";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-3xl grid md:grid-cols-[360px_1fr] gap-8">

        <section className="flex items-center justify-center">
          <div className="relative w-80 h-80">
            <Image
              src={`/api/vouchers/qr?code=${encodeURIComponent(code)}`}
              alt={`QR ${code}`}
              fill
              className="rounded-xl border"
            />
          </div>
        </section>

        <section className="rounded-2xl border p-6 bg-white shadow-sm">
          <h1 className="text-2xl font-semibold">Gift Voucher</h1>

          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div className="border p-4 rounded">
              <div className="opacity-60">Code</div>
              <div className="font-mono mt-1">{v.code}</div>
            </div>

            <div className="border p-4 rounded">
              <div className="opacity-60">Status</div>
              <div className="mt-1 capitalize">{v.status}</div>
            </div>

            <div className="border p-4 rounded">
              <div className="opacity-60">Remaining</div>
              <div className="mt-1">{remaining}</div>
            </div>

            <div className="border p-4 rounded">
              <div className="opacity-60">Original</div>
              <div className="mt-1">{initial}</div>
            </div>

            <div className="border p-4 rounded">
              <div className="opacity-60">Expires</div>
              <div className="mt-1">{exp}</div>
            </div>

            <div className="border p-4 rounded">
              <div className="opacity-60">Issued</div>
              <div className="mt-1">
                {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm opacity-80">
            Staff: scan this QR in store to redeem.
          </p>
        </section>

      </div>
    </main>
  );
}
