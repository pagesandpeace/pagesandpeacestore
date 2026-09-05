import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/users");

  const { data, error } = await supabaseService().auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error("Unable to load users.");

  const users = data.users;
  return <main className="mx-auto max-w-6xl space-y-6 py-10">
    <div><p className="text-sm font-medium text-foreground/60">Rebuild admin</p><h1 className="mt-1 text-3xl font-bold">Users</h1><p className="mt-2 text-foreground/65">All authenticated accounts in the staging project.</p></div>
    <div className="overflow-hidden rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-[#f8f5f1] text-foreground/60"><tr><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Email</th><th className="px-5 py-4">Joined</th><th className="px-5 py-4">Email status</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t"><td className="px-5 py-4 font-medium">{typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "Customer"}</td><td className="px-5 py-4">{user.email ?? "—"}</td><td className="px-5 py-4 text-foreground/65">{new Date(user.created_at).toLocaleDateString("en-GB")}</td><td className="px-5 py-4 text-foreground/65">{user.email_confirmed_at ? "Confirmed" : "Unconfirmed"}</td></tr>)}</tbody></table>{!users.length ? <p className="p-8 text-center text-foreground/60">No authenticated users yet.</p> : null}</div>
  </main>;
}
