import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📥 SEND MAGIC LINK (PUBLIC)");

  try {
    const body = await req.json();
    const { email, callbackURL, intent } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?intent=${intent || "signin"}&callbackURL=${encodeURIComponent(
      callbackURL || "/dashboard"
    )}`;

    console.log("📧 Email:", email);
    console.log("🔁 Redirect:", redirectTo);

    /* -------------------------
       CHECK IF USER EXISTS
    ------------------------- */
    const { data: usersData, error: listError } =
      await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("❌ listUsers error:", listError);
      return NextResponse.json(
        { error: "User lookup failed" },
        { status: 500 }
      );
    }

    const exists = usersData.users.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    console.log("🧠 User exists:", exists);

    /* -------------------------
       SEND CORRECT FLOW
    ------------------------- */
    let error;

    if (!exists) {
      console.log("🆕 Invite flow");

      const res = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      });

      error = res.error;
    } else {
      console.log("🔐 Magic link flow");

      const res = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      error = res.error;
    }

    /* -------------------------
       ERROR HANDLING
    ------------------------- */
    if (error) {
      console.error("❌ Magic link error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("✅ Magic link sent to:", email);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Server crash:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}