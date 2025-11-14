export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUserServer } from "@/lib/auth/actions";

export default async function AdminAccountPage() {
  const user = await getCurrentUserServer();

  // Protect route + avoid build crashes
  if (!user) {
    redirect("/sign-in");
  }

  // Only admin/staff allowed
  if (user.role !== "admin" && user.role !== "staff") {
    redirect("/account");
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-3xl font-bold mb-4">My Admin Account</h1>

      <div className="space-y-4 bg-white border p-6 rounded-lg shadow-sm">
        <p>
          <strong>Name:</strong> {user.name || "No name set"}
        </p>

        <p>
          <strong>Email:</strong> {user.email}</p>

        <p>
          <strong>Role:</strong>{" "}
          <span className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded-full border border-red-300 text-xs font-semibold">
            ADMIN
          </span>
        </p>

        <p>
          <strong>Created:</strong>{" "}
          {user.createdAt
            ? new Date(user.createdAt).toLocaleString("en-GB")
            : "Unknown"}
        </p>

        <p>
          <strong>Updated:</strong>{" "}
          {user.updatedAt
            ? new Date(user.updatedAt).toLocaleString("en-GB")
            : "Unknown"}
        </p>
      </div>

      <p className="text-neutral-600 text-sm">
        Editing admin accounts will be available soon.
      </p>
    </div>
  );
}
