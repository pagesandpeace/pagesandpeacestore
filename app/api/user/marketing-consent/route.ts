export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const { consent } = await req.json();
    if (typeof consent !== "boolean") return NextResponse.json({ error: "Invalid consent choice" }, { status: 400 });

    const auth = await supabaseAuthServer();
    const { data: { user } } = await auth.auth.getUser();
    if (!user || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = supabaseService().schema("app_core");
    const now = new Date().toISOString();
    const { error: updateError } = await db.from("customers").update({
      marketing_consent: consent,
      marketing_consent_at: now,
      updated_at: now,
    }).eq("auth_user_id", user.id);
    if (updateError) return NextResponse.json({ error: "Unable to save marketing choice" }, { status: 500 });
    if (!consent) return NextResponse.json({ success: true, subscribed: false });

    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
    const apiKey = process.env.BEEHIIV_API_KEY;
    if (!publicationId || !apiKey) return NextResponse.json({ success: true, subscribed: false, subscriptionError: "configuration_missing" });

    try {
      const res = await fetch(`https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, reactivate_existing: true, send_welcome_email: true }),
      });
      if (!res.ok) return NextResponse.json({ success: true, subscribed: false, subscriptionError: "beehiiv_failed" });

      await db.from("customers").update({ beehiiv_subscribed: true, beehiiv_subscribed_at: now, updated_at: now }).eq("auth_user_id", user.id);
      return NextResponse.json({ success: true, subscribed: true });
    } catch {
      return NextResponse.json({ success: true, subscribed: false, subscriptionError: "beehiiv_crash" });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
