// Preview redeploy trigger after Beehiiv environment update.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const { consent } = await req.json();

    if (typeof consent !== "boolean") {
      return NextResponse.json({ error: "Invalid consent choice" }, { status: 400 });
    }

    const supabase = await supabaseAuthServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = supabaseService();
    const now = new Date().toISOString();

    // marketing_consent_at records when the user made an explicit choice,
    // including "No thanks", so onboarding is not shown repeatedly.
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        marketing_consent: consent,
        marketing_consent_at: now,
        updated_at: now,
      })
      .eq("auth_user_id", user.id);

    if (updateError) {
      console.error("Marketing consent update failed:", updateError.message);
      return NextResponse.json({ error: "Unable to save marketing choice" }, { status: 500 });
    }

    if (!consent) {
      return NextResponse.json({ success: true, subscribed: false });
    }

    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
    const apiKey = process.env.BEEHIIV_API_KEY;

    if (!publicationId || !apiKey) {
      console.error("Beehiiv configuration missing for marketing consent subscription");
      return NextResponse.json({ success: true, subscribed: false, subscriptionError: "configuration_missing" });
    }

    try {
      const res = await fetch(
        `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            reactivate_existing: true,
            send_welcome_email: true,
          }),
        }
      );

      if (!res.ok) {
        const responseText = await res.text().catch(() => "");
        console.error("Beehiiv subscription failed:", res.status, responseText.slice(0, 500));
        return NextResponse.json({ success: true, subscribed: false, subscriptionError: "beehiiv_failed" });
      }

      const { error: beehiivUpdateError } = await supabaseAdmin
        .from("users")
        .update({
          beehiiv_subscribed: true,
          beehiiv_subscribed_at: now,
          updated_at: now,
        })
        .eq("auth_user_id", user.id);

      if (beehiivUpdateError) {
        console.error("Beehiiv status update failed:", beehiivUpdateError.message);
      }

      return NextResponse.json({ success: true, subscribed: true });
    } catch (err) {
      console.error("Beehiiv subscription crashed:", err);
      return NextResponse.json({ success: true, subscribed: false, subscriptionError: "beehiiv_crash" });
    }
  } catch (err) {
    console.error("Marketing consent route crashed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
