export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  console.log("🟡 [SUPPLIER ORDERS] Route hit");

  const supabase = await supabaseServer();

  /* -------------------------
     AUTH USER
  ------------------------- */
  const { data: auth, error: authError } = await supabase.auth.getUser();

  console.log("🟡 [SUPPLIER ORDERS] auth.getUser()", {
    auth,
    authError,
  });

  if (!auth?.user) {
    console.error("🔴 [SUPPLIER ORDERS] No authenticated user");
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  /* -------------------------
     PROFILE / ROLE
  ------------------------- */
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, role, auth_user_id")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();

  console.log("🟡 [SUPPLIER ORDERS] profile lookup", {
    profile,
    profileError,
    auth_user_id: auth.user.id,
  });

  if (!profile) {
    console.error("🔴 [SUPPLIER ORDERS] No profile row for user");
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 403 }
    );
  }

  if (profile.role !== "admin") {
    console.error("🔴 [SUPPLIER ORDERS] User not admin", {
      role: profile.role,
    });
    return NextResponse.json(
      { error: "Admins only" },
      { status: 403 }
    );
  }

  /* -------------------------
     QUERY SUPPLIER ORDERS
  ------------------------- */
  console.log("🟡 [SUPPLIER ORDERS] Querying supplier_order_requests");

  const { data, error } = await supabase
    .from("supplier_order_requests")
    .select(`
      id,
      supplier,
      quantity,
      unit_cost,
      status,
      requested_at,
      ordered_at,
      received_at,
      product:products(
        id,
        name,
        display_title
      )
    `)
    .order("requested_at", { ascending: false });

  console.log("🟡 [SUPPLIER ORDERS] query result", {
    rowCount: data?.length,
    error,
  });

  if (error) {
    console.error("🔴 [SUPPLIER ORDERS] SELECT FAILED", error);
    return NextResponse.json(
      { error: error.message, detail: error },
      { status: 500 }
    );
  }

  console.log("🟢 [SUPPLIER ORDERS] Success");

  return NextResponse.json(data ?? []);
}
