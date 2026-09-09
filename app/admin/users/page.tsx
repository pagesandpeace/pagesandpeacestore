import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CircleHelp,
  Crown,
  MailCheck,
  MailWarning,
  MailX,
  TicketCheck,
  UserRoundCheck,
} from "lucide-react";

import Pagination from "@/components/admin/Pagination";
import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const money = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

type CustomerProfile = {
  auth_user_id: string;
  display_name: string | null;
  email: string | null;
  marketing_consent: boolean | null;
  marketing_consent_at: string | null;
  beehiiv_subscribed: boolean | null;
  beehiiv_subscribed_at: string | null;
};

type EventOrder = {
  auth_user_id: string | null;
  status: string;
  total_pence: number;
  refunded_total_pence: number | null;
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/users");

  const requestedPage = Number((await searchParams).page ?? "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const service = supabaseService();
  const db = service.schema("app_core");
  const [{ data: authData, error: authError }, { data: profileData, error: profileError }, { data: orderData, error: orderError }] =
    await Promise.all([
      service.auth.admin.listUsers({ perPage: 1000 }),
      db
        .from("customers")
        .select("auth_user_id, display_name, email, marketing_consent, marketing_consent_at, beehiiv_subscribed, beehiiv_subscribed_at"),
      db
        .from("orders")
        .select("auth_user_id, status, total_pence, refunded_total_pence")
        .in("status", ["paid", "partially_refunded", "refunded"]),
    ]);

  if (authError) throw new Error("Unable to load users.");
  if (profileError) throw new Error("Unable to load customer profiles.");
  if (orderError) throw new Error("Unable to load event purchase history.");

  const profiles = new Map(
    ((profileData ?? []) as CustomerProfile[]).map((profile) => [profile.auth_user_id, profile])
  );

  const spendByUser = new Map<string, { orders: number; netPence: number }>();
  for (const order of (orderData ?? []) as EventOrder[]) {
    if (!order.auth_user_id) continue;
    const current = spendByUser.get(order.auth_user_id) ?? { orders: 0, netPence: 0 };
    current.orders += 1;
    current.netPence += Math.max(0, Number(order.total_pence) - Number(order.refunded_total_pence ?? 0));
    spendByUser.set(order.auth_user_id, current);
  }

  const allUsers = authData.users;
  const totalPages = Math.max(1, Math.ceil(allUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const users = allUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const topSpenders = [...spendByUser.entries()]
    .filter(([, spend]) => spend.netPence > 0)
    .sort((a, b) => b[1].netPence - a[1].netPence)
    .slice(0, 8)
    .map(([authUserId, spend]) => {
      const profile = profiles.get(authUserId);
      return {
        authUserId,
        name: profile?.display_name || "Customer",
        email: profile?.email || "",
        ...spend,
      };
    });

  return (
    <main className="mx-auto max-w-7xl space-y-8 py-10">
      <div>
        <p className="text-sm font-medium text-foreground/60">Rebuild admin</p>
        <h1 className="mt-1 text-3xl font-bold">Users</h1>
        <p className="mt-2 text-foreground/65">Authenticated customer accounts and event purchasing activity.</p>
      </div>

      <section className="rounded-2xl border bg-white p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Crown className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-bold">Top spenders</h2>
            <p className="mt-1 text-sm text-foreground/60">Highest net event spend, after refunds.</p>
          </div>
        </div>
        {topSpenders.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {topSpenders.map((spender, index) => (
              <div key={spender.authUserId} className="rounded-xl border bg-[#fbf8f4] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{spender.name}</p>
                    <p className="truncate text-xs text-foreground/55">{spender.email || "No email"}</p>
                  </div>
                  <span className="inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-full bg-black px-2 text-xs font-semibold text-white">
                    <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                    {index + 1}
                  </span>
                </div>
                <p className="mt-4 text-2xl font-bold">{money(spender.netPence)}</p>
                <p className="mt-1 text-xs text-foreground/55">{spender.orders} event order{spender.orders === 1 ? "" : "s"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-foreground/60">No paid event customers yet.</p>
        )}
      </section>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-[#f8f5f1] text-foreground/60">
            <tr>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Joined</th>
              <th className="px-5 py-4">Email verified</th>
              <th className="px-5 py-4">Purchases</th>
              <th className="px-5 py-4">Marketing</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const profile = profiles.get(user.id);
              const spend = spendByUser.get(user.id);
              const hasEventPurchase = (spend?.orders ?? 0) > 0;
              const subscribed = profile?.marketing_consent === true && profile?.beehiiv_subscribed === true;
              const consentedButNotSynced = profile?.marketing_consent === true && profile?.beehiiv_subscribed !== true;
              const declined = profile?.marketing_consent === false && profile?.marketing_consent_at != null;

              return (
                <tr key={user.id} className="border-t align-top">
                  <td className="px-5 py-4 font-medium">{profile?.display_name || "Customer"}</td>
                  <td className="px-5 py-4">{profile?.email || user.email || "—"}</td>
                  <td className="px-5 py-4 text-foreground/65">
                    {new Date(user.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-5 py-4">
                    {user.email_confirmed_at ? (
                      <StatusBadge className="bg-emerald-100 text-emerald-800" icon={<BadgeCheck className="h-3.5 w-3.5" />}>
                        Confirmed
                      </StatusBadge>
                    ) : (
                      <StatusBadge className="bg-amber-100 text-amber-800" icon={<MailWarning className="h-3.5 w-3.5" />}>
                        Unconfirmed
                      </StatusBadge>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {hasEventPurchase ? (
                      <div className="space-y-1.5">
                        <StatusBadge className="bg-emerald-100 text-emerald-800" icon={<TicketCheck className="h-3.5 w-3.5" />}>
                          Event buyer
                        </StatusBadge>
                        <p className="text-xs text-foreground/55">{money(spend?.netPence ?? 0)} net</p>
                      </div>
                    ) : (
                      <StatusBadge className="bg-stone-100 text-stone-500" icon={<UserRoundCheck className="h-3.5 w-3.5" />}>
                        No purchases
                      </StatusBadge>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {subscribed ? (
                      <StatusBadge className="bg-emerald-100 text-emerald-800" icon={<MailCheck className="h-3.5 w-3.5" />}>
                        Subscribed
                      </StatusBadge>
                    ) : consentedButNotSynced ? (
                      <StatusBadge className="bg-amber-100 text-amber-800" icon={<MailWarning className="h-3.5 w-3.5" />}>
                        Consent saved
                      </StatusBadge>
                    ) : declined ? (
                      <StatusBadge className="bg-rose-50 text-rose-700" icon={<MailX className="h-3.5 w-3.5" />}>
                        No thanks
                      </StatusBadge>
                    ) : (
                      <StatusBadge className="bg-stone-100 text-stone-600" icon={<CircleHelp className="h-3.5 w-3.5" />}>
                        Not chosen
                      </StatusBadge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!users.length ? <p className="p-8 text-center text-foreground/60">No authenticated users yet.</p> : null}
        <Pagination page={safePage} totalPages={totalPages} basePath="/admin/users" />
      </div>
    </main>
  );
}

function StatusBadge({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {icon}
      <span>{children}</span>
    </span>
  );
}
