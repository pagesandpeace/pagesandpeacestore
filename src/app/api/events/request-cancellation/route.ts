import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventBookings, events, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    // ⭐ Accept FormData from <form method="POST">
    const formData = await req.formData();
    const bookingId = formData.get("bookingId")?.toString();

    if (!bookingId) {
      return NextResponse.json(
        { error: "No booking ID provided" },
        { status: 400 }
      );
    }

    // Fetch booking
    const booking = (
      await db
        .select()
        .from(eventBookings)
        .where(eq(eventBookings.id, bookingId))
    )[0];

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Fetch event
    const event = (
      await db
        .select()
        .from(events)
        .where(eq(events.id, booking.eventId))
    )[0];

    // Fetch user
    const user = (
      await db.select().from(users).where(eq(users.id, booking.userId))
    )[0];

    // ⭐ Update booking
    await db
      .update(eventBookings)
      .set({ cancellationRequested: true })
      .where(eq(eventBookings.id, bookingId));

    // ⭐ Send notification to admin
    await resend.emails.send({
      from: "Pages & Peace <admin@pagesandpeace.co.uk>",
      to: ["admin@pagesandpeace.co.uk"],
      subject: `Cancellation Request – ${event?.title ?? "Event"}`,
      html: `
        <h2>New Cancellation Request</h2>

        <p><strong>Event:</strong> ${event?.title}</p>
        <p><strong>Date:</strong> ${new Date(event?.date).toLocaleString(
          "en-GB"
        )}</p>

        <p><strong>Customer:</strong> ${user?.name} (${user?.email})</p>

        <p><strong>Booking ID:</strong> ${bookingId}</p>

        <br/>
        <p>Please review & process this in the admin dashboard.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Cancellation request error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
