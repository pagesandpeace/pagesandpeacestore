export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type Body = {
  ids: string[];
  action: "ordered" | "delivered" | "collected";
};

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const body: Body = await req.json();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    /* ---------------------------------------------
       ACTION HANDLING
    --------------------------------------------- */

    if (body.action === "ordered") {
      const { error } = await supabase
        .from("customer_backorders")
        .update({
          ordered_at: new Date().toISOString(),
        })
        .in("id", body.ids);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    if (body.action === "delivered") {
      const { error } = await supabase
        .from("customer_backorders")
        .update({
          received_at: new Date().toISOString(),
        })
        .in("id", body.ids);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    if (body.action === "collected") {
      const { error } = await supabase
        .from("customer_backorders")
        .update({
          collected_at: new Date().toISOString(),
        })
        .in("id", body.ids);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ bulk-update failed", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
