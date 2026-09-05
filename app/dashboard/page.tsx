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

  return <main className="flex-1 w-full bg-background text-foreground font-[Montserrat]">
    <div className="max-w-4xl mx-auto px-6 py-10">
      <section className="mb-10 p-6 rounded-2xl border border-border bg-muted/40 text-center">
        <h2 className="text-xl font-semibold mb-2">🍽️ Pre-order food for your event</h2>
        <p className="text-sm text-foreground/70 mb-4">Skip the queue and have everything ready when you arrive.</p>
        <a href="https://tally.so/r/Med4gl" target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-3 rounded-full bg-accent text-white font-semibold">Pre-order now →</a>
      </section>

      <header className="mb-10"><h1 className="text-3xl font-semibold">Welcome back, {user.user_metadata?.name || "Reader"} ☕</h1></header>

      <section className="mb-10 rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-semibold">Upcoming events</h2><p className="mt-1 text-sm text-foreground/70">Your confirmed Pages & Peace bookings.</p></div>
          <Link href="/dashboard/orders" className="rounded-full border-2 border-accent px-4 py-2 text-sm font-semibold text-accent">Order history</Link>
        </div>
        {upcoming.length ? <div className="mt-5 space-y-3">{upcoming.map((line) => <article key={line.id} className="rounded-xl bg-muted/40 p-4"><p className="font-semibold">{line.event!.title}</p><p className="mt-1 text-sm text-foreground/70">{new Date(line.event!.starts_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p><p className="mt-1 text-sm text-foreground/70">{line.ticket?.name ?? "Ticket"} × {line.quantity}</p></article>)}</div> : <p className="mt-5 text-sm text-foreground/70">You have no upcoming bookings yet. <Link href="/events" className="underline">Browse events</Link>.</p>}
      </section>

      <section className="py-6 border-b">
        <p className="text-xs uppercase tracking-wide">Recent Orders</p>
        <p className="text-sm text-[#555] max-w-sm">Track your latest purchases and their status.</p>
        <Link href="/dashboard/orders" className="inline-block mt-3 px-6 py-3 rounded-full border-2 border-accent text-accent">View Orders →</Link>
      </section>

      <section className="py-6 border-b">
        <p className="text-xs uppercase tracking-wide">Account</p>
        <p className="text-sm max-w-sm text-[#555]">Update your personal information.</p>
        <Link href="/dashboard/account" className="inline-block mt-3 px-6 py-3 rounded-full border-2 border-accent text-accent">Manage Account →</Link>
      </section>

      <section className="py-6">
        <p className="text-xs uppercase tracking-wide">Preferences</p>
        <p className="text-sm max-w-sm text-[#555]">Adjust settings and preferences.</p>
        <Link href="/dashboard/settings" className="inline-block mt-3 px-6 py-3 rounded-full border-2 border-accent text-accent">Go to Settings →</Link>
      </section>
    </div>
  </main>;
}
