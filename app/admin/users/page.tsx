import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type MarketingProfile = {
  auth_user_id: string | null;
  marketing_consent: boolean | null;
  marketing_consent_at: string | null;
  beehiiv_subscribed: boolean | null;
  beehiiv_subscribed_at: string | null;
};

export default async function UsersPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/users");

  const service = supabaseService();
  const [{ data: authData, error: authError }, { data: profileData, error: profileError }] = await Promise.all([
    service.auth.admin.listUsers({ perPage: 1000 }),
    service
      .from("users")
      .select("auth_user_id, marketing_consent, marketing_consent_at, beehiiv_subscribed, beehiiv_subscribed_at"),
  ]);

  if (authError) throw new Error("Unable to load users.");
  if (profileError) throw new Error("Unable to load user marketing status.");

  const profiles = new Map(
    ((profileData ?? []) as MarketingProfile[])
      .filter((profile) => profile.auth_user_id)
      .map((profile) => [profile.auth_user_id as string, profile])
  );

  const users = authData.users;

  return (
    <main className="mx-auto max-w-7xl space-y-6 py-10">
      <div>
        <p className="text-sm font-medium text-foreground/60">Rebuild admin</p>
        <h1 className="mt-1 text-3xl font-bold">Users</h1>
        <p className="mt-2 text-foreground/65">All authenticated accounts in the staging project.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-[#f8f5f1] text-foreground/60">
            <tr>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Joined</th>
              <th className="px-5 py-4">Email verified</th>
              <th className="px-5 py-4">Marketing</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const profile = profiles.get(user.id);
              const subscribed = profile?.marketing_consent === true && profile?.beehiiv_subscribed === true;
              const consentedButNotSynced = profile?.marketing_consent === true && profile?.beehiiv_subscribed !== true;
              const declined = profile?.marketing_consent === false && profile?.marketing_consent_at != null;

              return (
                <tr key={user.id} className="border-t align-top">
                  <td className="px-5 py-4 font-medium">
                    {typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "Customer"}
                  </td>
                  <td className="px-5 py-4">{user.email ?? "—"}</td>
                  <td className="px-5 py-4 text-foreground/65">
                    {new Date(user.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-5 py-4 text-foreground/65">
                    {user.email_confirmed_at ? "Confirmed" : "Unconfirmed"}
                  </td>
                  <td className="px-5 py-4">
                    {subscribed ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                        ✓ Subscribed
                      </span>
                    ) : consentedButNotSynced ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        Consent saved · not synced
                      </span>
                    ) : declined ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        No thanks
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Not chosen
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!users.length ? <p className="p-8 text-center text-foreground/60">No authenticated users yet.</p> : null}
      </div>
    </main>
  );
}
