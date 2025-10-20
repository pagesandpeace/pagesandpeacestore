import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/(auth)/sign-in");

  // TODO: replace with real RBAC (profiles.role === 'admin')
  const isAdmin = (user.email ?? "").endsWith("@yourdomain.com");
  if (!isAdmin) redirect("/account");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-zinc-600">Welcome, admin.</p>
    </div>
  );
}
