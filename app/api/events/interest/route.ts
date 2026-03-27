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

    /* ------------------ AUTH CLIENT ------------------ */
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("👤 USER:", user);

    if (!user) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    /* ------------------ SERVICE ROLE CLIENT ------------------ */
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
        user_id: user.id,
        first_name:
          user.user_metadata?.full_name?.split(" ")[0] ||
          user.email?.split("@")[0] ||
          null,
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

    console.log("✅ Interest saved");

    /* ------------------ EMAIL ------------------ */
    try {
      console.log("📧 Sending email...");
      console.log("📧 RESEND KEY EXISTS:", !!process.env.RESEND_API_KEY);

      const resend = new Resend(process.env.RESEND_API_KEY);

      const emailRes = await resend.emails.send({
        from: "Pages & Peace <onboarding@resend.dev>",
        to: "mattymclauchlan@gmail.com", // 🔥 TEMP HARD CODE FOR TEST
        subject: `You're registered for ${event.title}`,
        html: `
          <h2>You're on the list 👀</h2>
          <p>You've registered interest for:</p>
          <strong>${event.title}</strong>
          <p>${new Date(event.date).toLocaleString("en-GB")}</p>

          <br />

          <p>We’ll let you know when tickets go live.</p>
          <p>– Pages & Peace</p>
        `,
      });

      console.log("📧 EMAIL RESPONSE:", emailRes);
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