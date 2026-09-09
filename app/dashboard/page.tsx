import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, ReceiptText, TicketCheck, WalletCards } from "lucide-react";

import MarketingConsentCard from "@/app/dashboard/(ui)/MarketingConsentCard";
import { getCustomerEventOrders } from "@/lib/app-core/event-orders";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: profile }, orders] = await Promise.all([
    supabaseService()
      .schema("app_core")
      .from("customers")
      .select("display_name,marketing_consent,marketing_consent_at")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
    getCustomerEventOrders(user.id),
  ]);

  const showMarketingConsent = profile?.marketing_consent_at == null;
  const displayName = profile?.display_name?.trim() || "Reader";

  const upcoming = orders.flatMap((order) => order.lines)
    .filter((line) => line.event && new Date(line.event.starts_at) > new Date() && Number(line.quantity) - Number(line.refunded_quantity ?? 0) > 0)
    .sort((a, b) => new Date(a.event!.starts_at).getTime() - new Date(b.event!.starts_at).getTime());

  const netSpendPence = orders.reduce((orderTotal, order) => orderTotal + order.lines.reduce((lineTotal, line) => {
    const original = Number(line.quantity) * Number(line.unit_amount_pence);
    return lineTotal + Math.max(0, original - Number(line.refunded_amount_pence ?? 0));
  }, 0), 0);
  const activeTickets = orders.reduce((orderTotal, order) => orderTotal + order.lines.reduce((lineTotal, line) => lineTotal + Math.max(0, Number(line.quantity) - Number(line.refunded_quantity ?? 0)), 0), 0);
  const nextEvent = upcoming[0]?.event?.starts_at ?? null;

  return <main className="flex-1 w-full bg-background text-foreground font-[Montserrat]">
    <div className="max-w-4xl mx-auto px-6 py-10">
      {showMarketingConsent ? <MarketingConsentCard /> : null}

      <section className="mb-10 p-6 rounded-2xl border border-border bg-muted/40 text-center">
        <h2 className="text-xl font-semibold mb-2">🍽️ Pre-order food for your event</h2>
        <p className="text-sm text-foreground/70 mb-4">Skip the queue and have everything ready when you arrive.</p>
        <a href="https://tally.so/r/Med4gl" target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-3 rounded-full bg-accent text-white font-semibold">Pre-order now →</a>
      </section>

      <header className="mb-10"><h1 className="text-3xl font-semibold">Welcome back, {displayName} ☕</h1></header>

      <section className="mb-8 rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-semibold">Upcoming events</h2><p className="mt-1 text-sm text-foreground/70">Your confirmed Pages & Peace bookings.</p></div>
          <Link href="/dashboard/events" className="rounded-full border-2 border-accent px-4 py-2 text-sm font-semibold text-accent">View all events</Link>
        </div>
        {upcoming.length ? <div className="mt-5 space-y-3">{upcoming.slice(0, 3).map((line) => {
          const remainingQty = Number(line.quantity) - Number(line.refunded_quantity ?? 0);
          return <article key={line.id} className="rounded-xl bg-muted/40 p-4"><p className="font-semibold">{line.event!.title}</p><p className="mt-1 text-sm text-foreground/70">{new Date(line.event!.starts_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p><p className="mt-1 text-sm text-foreground/70">{line.ticket?.name ?? "Ticket"} × {remainingQty}</p></article>;
        })}</div> : <p className="mt-5 text-sm text-foreground/70">You have no upcoming bookings yet. <Link href="/events" className="underline">Browse events</Link>.</p>}
      </section>

      <section className="rounded-2xl border border-border bg-white p-6" aria-labelledby="account-summary-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 id="account-summary-heading" className="text-xl font-semibold">Your activity</h2><p className="mt-1 text-sm text-foreground/65">A quick summary of your Pages & Peace account.</p></div>
          <Link href="/dashboard/orders" className="text-sm font-semibold text-accent underline underline-offset-4">View order history</Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-muted/40 p-4"><ReceiptText className="h-5 w-5 text-accent" aria-hidden="true" /><p className="mt-3 text-2xl font-semibold">{orders.length}</p><p className="text-xs text-foreground/60">event order{orders.length === 1 ? "" : "s"}</p></div>
          <div className="rounded-xl bg-muted/40 p-4"><TicketCheck className="h-5 w-5 text-accent" aria-hidden="true" /><p className="mt-3 text-2xl font-semibold">{activeTickets}</p><p className="text-xs text-foreground/60">active ticket{activeTickets === 1 ? "" : "s"}</p></div>
          <div className="rounded-xl bg-muted/40 p-4"><WalletCards className="h-5 w-5 text-accent" aria-hidden="true" /><p className="mt-3 text-2xl font-semibold">£{(netSpendPence / 100).toFixed(2)}</p><p className="text-xs text-foreground/60">net event spend</p></div>
          <div className="rounded-xl bg-muted/40 p-4"><CalendarDays className="h-5 w-5 text-accent" aria-hidden="true" /><p className="mt-3 text-sm font-semibold">{nextEvent ? new Date(nextEvent).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "None booked"}</p><p className="text-xs text-foreground/60">next event</p></div>
        </div>
      </section>
    </div>
  </main>;
}
