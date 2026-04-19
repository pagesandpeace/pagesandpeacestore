export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const { consent } = await req.json();

    const supabase = await supabaseAuthServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = supabaseService();
    const now = new Date().toISOString();

    /* -------------------------
       UPDATE USER
    ------------------------- */
    await supabaseAdmin
      .from("users")
      .update({
        marketing_consent: consent,
        marketing_consent_at: consent ? now : null,
        updated_at: now,
      })
      .eq("auth_user_id", user.id);

    /* -------------------------
       BEEHIIV SUBSCRIBE
    ------------------------- */
    if (consent) {
      const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
      const apiKey = process.env.BEEHIIV_API_KEY;

      if (publicationId && apiKey) {
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

          if (res.ok) {
            await supabaseAdmin
              .from("users")
              .update({
                beehiiv_subscribed: true,
                beehiiv_subscribed_at: now,
              })
              .eq("auth_user_id", user.id);
          } else {
            console.error("❌ Beehiiv failed");
          }
        } catch (err) {
          console.error("❌ Beehiiv crash:", err);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}