import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type MarkCollectedBody = {
  backorder_id: string;
  markPaid?: boolean;
};

type BackorderCollectedUpdate = {
  collected_at: string;
  payment_status?: "paid";
};

export async function POST(req: Request) {
  try {
    console.log("🟢 [MARK COLLECTED] route hit");

    /* -------------------------------------
       AUTH (admin only)
    ------------------------------------- */
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    /* -------------------------------------
       BODY
    ------------------------------------- */
    const body: MarkCollectedBody = await req.json();

    if (!body.backorder_id) {
      return NextResponse.json(
        { error: "backorder_id required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    /* -------------------------------------
       UPDATE
    ------------------------------------- */
    const update: BackorderCollectedUpdate = {
      collected_at: now,
    };

    if (body.markPaid) {
      update.payment_status = "paid";
    }

    const { error } = await supabaseAdmin
      .from("customer_backorders")
      .update(update)
      .eq("id", body.backorder_id)
      .is("collected_at", null);

    if (error) {
      console.error("❌ [MARK COLLECTED] failed", error);
      return NextResponse.json(
        { error: "Failed to mark collected" },
        { status: 500 }
      );
    }

    console.log("✅ [MARK COLLECTED] success", {
      backorder_id: body.backorder_id,
      markPaid: body.markPaid ?? false,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("🔥 [MARK COLLECTED FATAL]", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
