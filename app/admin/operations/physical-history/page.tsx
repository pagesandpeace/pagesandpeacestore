import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import PhysicalSalesHistoryClient from "./PhysicalSalesHistoryClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ---------------------------------------------
   SERVICE ROLE CLIENT
--------------------------------------------- */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* ---------------------------------------------
   PAGE
--------------------------------------------- */
export default async function PhysicalSalesHistoryPage() {
  const supabase = await supabaseServer();

  /* ---------------- AUTH ---------------- */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/sign-in?callbackURL=/admin/operations/physical-history"
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, name")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  /* ---------------- DATA ---------------- */

  const { data: salesRaw, error } = await supabaseAdmin
    .from("pos_sales")
    .select(`
      id,
      sale_number,
      total,
      notes,
      created_at,
      created_by,
      users:created_by ( name )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("❌ POS SALES LOAD FAILED", error);
    throw error;
  }

  const sales =
    salesRaw?.map((s) => ({
      id: s.id,
      sale_number: s.sale_number,
      total: Number(s.total),
      notes: s.notes,
      created_at: s.created_at,
      staff_name: s.users?.[0]?.name ?? "Unknown",
    })) ?? [];

  /* ---------------- RENDER ---------------- */
  return (
    <PhysicalSalesHistoryClient sales={sales} />
  );
}
