import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function EventConfirmationPage({
  params,
}: {
  params: { id: string };
}) {
  const eventId = params.id;

  // Load event to show details
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <h1 className="text-3xl font-semibold">Event Not Found</h1>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-24 text-center">
      <h1 className="text-4xl font-bold mb-6">Your Seat Is Reserved!</h1>

      <p className="text-lg text-neutral-700 mb-4">
        Thank you for booking a place at <strong>{event.title}</strong>.
      </p>

      <div className="p-6 border rounded-lg bg-neutral-50 text-left mt-6">
        <p className="text-lg">
          <strong>Date & Time:</strong><br />
          {new Date(event.date).toLocaleString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        <p className="text-lg mt-4">
          <strong>Location:</strong><br />
          Pages & Peace Café<br />
          5A King Avenue<br />
          Rossington, Doncaster
        </p>

        <p className="text-lg mt-4">
          <strong>What to bring:</strong><br />
          Just your book, a cosy mindset, and optionally a notebook.
        </p>

        <p className="text-lg mt-4">
          <strong>Need to cancel?</strong><br />
          Reply to your confirmation email or contact us on Instagram.
        </p>
      </div>

      <a
        href={`/events`}
        className="inline-block mt-10 bg-black text-white px-6 py-3 rounded hover:bg-neutral-800"
      >
        Browse More Events
      </a>
    </div>
  );
}
