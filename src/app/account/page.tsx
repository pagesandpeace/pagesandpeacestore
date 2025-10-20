import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/(auth)/sign-in");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">My account</h1>
      <div className="rounded-lg border p-4">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Name:</strong> {user.name ?? "-"}</p>
      </div>
    </div>
  );
}
