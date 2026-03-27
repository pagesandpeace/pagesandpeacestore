import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await context.params;

  /* ------------------ AUTH (USER) ------------------ */
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("👤 interest-status user:", user?.id);
  console.log("📌 interest-status eventId:", eventId);

  if (!user) {
    return NextResponse.json({ interested: false });
  }

  /* ------------------ SERVICE ROLE (READ) ------------------ */
  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await admin
    .from("event_interest")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("❌ Interest status error:", error);
  }

  console.log("📊 interest-status result:", data);

  return NextResponse.json({
    interested: !!data,
  });
}