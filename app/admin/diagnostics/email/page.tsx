import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/auth/require-admin-user";

export const dynamic = "force-dynamic";

export default async function EmailDiagnosticPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; sent?: string; error?: string }>;
}) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in");

  const params = await searchParams;
  const orderId = params.order_id ?? "";
  const status = params.sent === "1"
    ? "Confirmation email sent successfully."
    : params.error === "send-failed"
      ? "The send failed. The server log now contains the non-sensitive reason."
      : params.error === "invalid-order"
        ? "Enter a valid order ID."
        : "This sends a booking confirmation for an existing paid staging order only.";

  return <main className="mx-auto min-h-screen max-w-xl px-6 py-20">
    <h1 className="text-3xl font-bold">Email confirmation test</h1>
    <p className="mt-4 text-foreground/70">{status}</p>
    <form action="/api/app-core/admin/resend-confirmation" method="post" className="mt-8 space-y-4">
      <label className="block text-sm font-medium" htmlFor="order_id">Paid order ID</label>
      <input id="order_id" name="order_id" defaultValue={orderId} required className="w-full rounded border px-3 py-2" />
      <button type="submit" className="rounded-lg bg-black px-5 py-3 font-semibold text-white">Send confirmation email</button>
    </form>
  </main>;
}
