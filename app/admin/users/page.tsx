import { redirect } from "next/navigation";

import { appCoreDb } from "@/lib/app-core/service";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in?callbackURL=/admin/users");

  const { data: customers, error } = await appCoreDb()
    .from("customers")
    .select("auth_user_id, email, display_name, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load customers.");

  return <main className="mx-auto max-w-6xl space-y-6 py-10">
    <div><p className="text-sm font-medium text-foreground/60">Rebuild admin</p><h1 className="mt-1 text-3xl font-bold">Customers</h1><p className="mt-2 text-foreground/65">Customer records created and used by the rebuilt event system.</p></div>
    <div className="overflow-hidden rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-[#f8f5f1] text-foreground/60"><tr><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Email</th><th className="px-5 py-4">Joined</th></tr></thead><tbody>{(customers ?? []).map((customer) => <tr key={customer.auth_user_id} className="border-t"><td className="px-5 py-4 font-medium">{customer.display_name || "Customer"}</td><td className="px-5 py-4">{customer.email}</td><td className="px-5 py-4 text-foreground/65">{new Date(customer.created_at).toLocaleDateString("en-GB")}</td></tr>)}</tbody></table>{!(customers ?? []).length ? <p className="p-8 text-center text-foreground/60">No rebuilt customer records yet.</p> : null}</div>
  </main>;
}