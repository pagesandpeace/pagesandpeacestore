import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

type Row = {
  product_id: string;
  product_name: string;
  current_stock: number;
  last_movement_at: string | null;
};

export const dynamic = "force-dynamic";

export default async function FoodStockOverviewPage() {
  noStore();

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data, error } = await supabase
    .rpc("food_stock_overview");

  if (error) {
    throw new Error("Failed to load stock overview");
  }

  const rows = (data ?? []) as Row[];

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">
        Food Stock Overview
      </h1>

      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">
                Product
              </th>
              <th className="text-right px-3 py-2">
                Stock
              </th>
              <th className="text-right px-3 py-2">
                Last movement
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr
                key={r.product_id}
                className="border-t"
              >
                <td className="px-3 py-2">
                  {r.product_name}
                </td>

                <td
                  className={`px-3 py-2 text-right font-medium ${
                    r.current_stock <= 0
                      ? "text-red-600"
                      : r.current_stock < 5
                      ? "text-amber-600"
                      : "text-green-700"
                  }`}
                >
                  {r.current_stock}
                </td>

                <td className="px-3 py-2 text-right text-gray-600">
                  {r.last_movement_at
                    ? new Date(
                        r.last_movement_at
                      ).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "—"}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-6 text-center text-gray-600"
                >
                  No food products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
