import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const FOOD_FORM_URL = "https://tally.so/r/Med4gl";

  return (
    <div className="flex-1 w-full bg-background text-foreground font-[Montserrat]">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* 🔥 FOOD PRE-ORDER CTA */}
        <section className="mb-10 p-6 rounded-2xl border border-border bg-muted/40 text-center">
          <h2 className="text-xl font-semibold mb-2">
            🍽️ Pre-order food for your event
          </h2>

          <p className="text-sm text-foreground/70 mb-4">
            Skip the queue and have everything ready when you arrive.
          </p>

          <a
            href={FOOD_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 rounded-full bg-accent text-white font-semibold"
          >
            Pre-order now →
          </a>
        </section>

        <header className="mb-12">
          <h1 className="text-3xl font-semibold">
            Welcome back, {user?.user_metadata?.name || "Reader"} ☕
          </h1>
        </header>

        {/* Orders */}
        <section className="pb-6 border-b">
          <div>
            <p className="text-xs uppercase tracking-wide">Recent Orders</p>
            <p className="text-sm text-[#555] max-w-sm">
              Track your latest purchases and their status.
            </p>
          </div>

          <Link
            href="/dashboard/orders"
            className="inline-block px-6 py-3 rounded-full border-2 border-accent text-accent"
          >
            View Orders →
          </Link>
        </section>

        {/* Account */}
        <section className="py-6 border-b">
          <p className="text-xs uppercase tracking-wide">Account</p>
          <p className="text-sm max-w-sm text-[#555]">
            Update your personal information.
          </p>

          <Link
            href="/dashboard/account"
            className="inline-block px-6 py-3 rounded-full border-2 border-accent text-accent"
          >
            Manage Account →
          </Link>
        </section>

        {/* Settings */}
        <section className="py-6">
          <p className="text-xs uppercase tracking-wide">Preferences</p>
          <p className="text-sm max-w-sm text-[#555]">
            Adjust settings and preferences.
          </p>

          <Link
            href="/dashboard/settings"
            className="inline-block px-6 py-3 rounded-full border-2 border-accent text-accent"
          >
            Go to Settings →
          </Link>
        </section>
      </div>
    </div>
  );
}