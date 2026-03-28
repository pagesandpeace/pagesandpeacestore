import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event_id } = body;

    if (!event_id) {
      return NextResponse.json(
        { error: "Missing event_id" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    /* ------------------ CLEAN USER DATA ------------------ */
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      "";

    const firstName =
      fullName.split(" ")[0] ||
      user.email?.split("@")[0] ||
      "Guest";

    const email = user.email ?? null;

    /* ------------------ ADMIN CLIENT ------------------ */
    const admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    /* ------------------ EVENT ------------------ */
    const { data: event } = await admin
      .from("events")
      .select("id, title, date")
      .eq("id", event_id)
      .single();

    if (!event) {
      return NextResponse.json(
        { error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ------------------ INSERT ------------------ */
    const { error: insertError } = await admin
      .from("event_interest")
      .insert({
        event_id,
        user_id: user.id, // keep auth id
        auth_user_id: user.id, // 🔥 NEW (future-proof)
        first_name: firstName,
        email: email, // 🔥 THIS FIXES YOUR ISSUE
      });

    if (
      insertError &&
      !insertError.message.toLowerCase().includes("duplicate")
    ) {
      console.error("❌ INSERT ERROR:", insertError);
      return NextResponse.json(
        { error: "FAILED_TO_SAVE" },
        { status: 500 }
      );
    }

    console.log("✅ Interest saved with email:", email);

    /* ------------------ EMAIL ------------------ */
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: "Pages & Peace <onboarding@resend.dev>",
        to: email!, // 🔥 now dynamic
        subject: `You're registered for ${event.title}`,
        html: `
          <h2>You're on the list 👀</h2>
          <p>${event.title}</p>
          <p>${new Date(event.date).toLocaleString("en-GB")}</p>
        `,
      });
    } catch (emailErr) {
      console.error("❌ EMAIL FAILED:", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}