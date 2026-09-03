import Link from "next/link";
import { redirect } from "next/navigation";

import { getCustomerEventOrders } from "@/lib/app-core/event-orders";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/sign-in");

  const orders = await getCustomerEventOrders(user.id);
  const upcoming = orders.flatMap((order) => order.lines)
    .filter((line) => line.event && new Date(line.event.starts_at) > new Date())
    .sort((a, b) => new Date(a.event!.starts_at).getTime() - new Date(b.event!.starts_at).getTime());

  return <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-[#111]">
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <p className="text-sm text-neutral-600">Pages & Peace</p>
        <h1 className="mt-1 text-3xl font-semibold">Welcome back{user.user_metadata?.name ? `, ${user.user_metadata.name}` : ""}</h1>
      </header>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-semibold">Upcoming events</h2><p className="mt-1 text-sm text-neutral-600">Your confirmed Pages & Peace bookings.</p></div>
          <Link href="/dashboard/orders" className="rounded-full border-2 border-accent px-4 py-2 text-sm font-semibold text-accent">Order history</Link>
        </div>
        {upcoming.length ? <div className="mt-5 space-y-3">{upcoming.map((line) => <article key={line.id} className="rounded-xl bg-[#FAF6F1] p-4">
          <p className="font-semibold">{line.event!.title}</p>
          <p className="mt-1 text-sm text-neutral-700">{new Date(line.event!.starts_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}{line.event!.location ? ` · ${line.event!.location}` : ""}</p>
          <p className="mt-1 text-sm text-neutral-600">{line.ticket?.name ?? "Ticket"} × {line.quantity}</p>
        </article>)}</div> : <p className="mt-5 text-sm text-neutral-600">You have no upcoming bookings yet. <Link href="/events" className="underline">Browse events</Link>.</p>}
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Account</h2>
        <p className="mt-1 text-sm text-neutral-600">Manage your personal details and preferences.</p>
        <Link href="/dashboard/account" className="mt-4 inline-block rounded-full border-2 border-accent px-5 py-2 font-semibold text-accent">Manage account</Link>
      </section>
    </div>
  </main>;
}
