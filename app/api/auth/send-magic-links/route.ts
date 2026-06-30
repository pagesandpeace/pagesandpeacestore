import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📥 SEND MAGIC LINK");

  try {
    const body = await req.json();
    const { email, callbackURL, intent } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email required" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const safeIntent = intent === "signup" ? "signup" : "signin";

    const redirectTo = `${
      process.env.NEXT_PUBLIC_SITE_URL
    }/auth/callback?intent=${safeIntent}&callbackURL=${encodeURIComponent(
      callbackURL || "/dashboard"
    )}`;

    console.log("📧 Email:", normalizedEmail);
    console.log("🎯 Intent:", safeIntent);
    console.log("🔁 Redirect:", redirectTo);

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectTo,

        // Important:
        // Sign-in should never create/invite users.
        shouldCreateUser: safeIntent === "signup",
      },
    });

    if (error) {
      console.error("❌ Magic link error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log("✅ Magic link sent to:", normalizedEmail);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Server crash:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}