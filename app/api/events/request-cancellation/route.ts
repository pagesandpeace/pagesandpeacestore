import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    // AUTH
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    // FORM DATA
    const formData = await req.formData();
    const bookingId = formData.get("bookingId")?.toString();

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    // BOOKING
    const { data: booking } = await supabase
      .from("event_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // EVENT
    const { data: event } = await supabase
      .from("events")
      .select("title, date")
      .eq("id", booking.event_id)
      .single();

    // MARK REQUEST
    await supabase
      .from("event_bookings")
      .update({ cancellation_requested: true })
      .eq("id", bookingId);

    // ADMIN NOTIFICATION
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Pages & Peace <admin@pagesandpeace.co.uk>",
      to: "admin@pagesandpeace.co.uk",
      subject: `Cancellation Request – ${event?.title}`,
      html: `
        <h2>New Cancellation Request</h2>
        <p><strong>Event:</strong> ${event?.title}</p>
        <p><strong>Date:</strong> ${new Date(event?.date).toLocaleString(
          "en-GB"
        )}</p>
        <p><strong>User:</strong> ${user.email}</p>
        <p><strong>Booking ID:</strong> ${bookingId}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Cancellation Request Error:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
