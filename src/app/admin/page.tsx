import { redirect } from "next/navigation";
import { getCurrentUserServer } from "@/lib/auth/actions";

export default async function AdminPage() {
  // ✔ Correct server-side version
  const user = await getCurrentUserServer();

  if (!user) {
    redirect("/(auth)/sign-in");
  }

  // ✔ Your admin rule
  const isAdmin = (user.email ?? "").endsWith("@yourdomain.com");
  if (!isAdmin) {
    redirect("/account");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-zinc-600">Welcome, admin.</p>
    </div>
  );
}
