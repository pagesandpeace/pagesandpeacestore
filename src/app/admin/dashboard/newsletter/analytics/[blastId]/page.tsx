// src/app/admin/dashboard/newsletter/analytics/[blastId]/page.tsx
import { db } from "@/lib/db";
import { emailBlasts, emailEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BlastAnalyticsPage({
  params,
}: {
  params: { blastId: string };
}) {
  const blastId = params.blastId;

  /* -----------------------------------------------------
     LOAD BLAST
  ----------------------------------------------------- */
  const blast = (
    await db.select().from(emailBlasts).where(eq(emailBlasts.id, blastId))
  )[0];

  if (!blast) {
    return (
      <div className="p-10 text-red-600">
        Blast not found.{" "}
        <Link href="/admin/dashboard/newsletter/analytics">
          Go back
        </Link>
      </div>
    );
  }

  /* -----------------------------------------------------
     LOAD ALL EVENTS FOR THIS BLAST
  ----------------------------------------------------- */
  const events = await db
    .select()
    .from(emailEvents)
    .where(eq(emailEvents.blastId, blastId));

  const opens = events.filter((e) => e.eventType === "opened");
  const clicks = events.filter((e) => e.eventType === "clicked");

  const uniqueOpens = new Set(opens.map((o) => o.subscriber)).size;
  const uniqueClicks = new Set(clicks.map((c) => c.subscriber)).size;

  const openRate = blast.recipientCount
    ? ((uniqueOpens / blast.recipientCount) * 100).toFixed(1)
    : "0";

  const clickRate = blast.recipientCount
    ? ((uniqueClicks / blast.recipientCount) * 100).toFixed(1)
    : "0";

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-10">
      <Link
        href="/admin/dashboard/newsletter/analytics"
        className="text-blue-600 underline"
      >
        ← Back to Analytics
      </Link>

      <h1 className="text-3xl font-bold">Blast Analytics</h1>

      {/* BLAST INFO */}
      <div className="p-5 rounded border bg-white shadow-sm space-y-2">
        <p className="text-xl font-semibold">{blast.subject}</p>
        <p className="text-sm text-gray-700">
          Category: <span className="font-medium">{blast.category}</span>
        </p>
        <p className="text-sm text-gray-700">
          Sent: {new Date(blast.createdAt).toLocaleString()}
        </p>
        <p className="text-sm text-gray-700">
          Recipients: {blast.recipientCount}
        </p>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric label="Unique Opens" value={uniqueOpens} />
        <Metric label="Unique Clicks" value={uniqueClicks} />
        <Metric label="Open Rate" value={`${openRate}%`} />
        <Metric label="Click Rate" value={`${clickRate}%`} />
      </div>

      {/* OPEN EVENTS */}
      <div className="p-5 border rounded bg-white shadow-sm">
        <h2 className="font-semibold text-lg mb-3">Open Activity</h2>

        {opens.length === 0 ? (
          <p className="text-gray-500">No opens recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {opens.map((o) => (
              <div key={o.id} className="p-2 border rounded text-sm">
                <p className="font-medium">{o.subscriber}</p>
                <p className="text-gray-600">
                  {new Date(o.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLICK EVENTS */}
<div className="p-5 border rounded bg-white shadow-sm">
  <h2 className="font-semibold text-lg mb-3">Click Activity</h2>

  {clicks.length === 0 ? (
    <p className="text-gray-500">No clicks recorded yet.</p>
  ) : (
    <div className="space-y-2">
      {clicks.map((c) => {
        const meta = (c.metadata as { url?: string }) || {};
        return (
          <div key={c.id} className="p-3 border rounded text-sm">
            <p className="font-medium">{c.subscriber}</p>

            <p className="text-gray-700 break-all mt-1">
              Clicked: {meta.url ?? "Unknown URL"}
            </p>

            <p className="text-gray-500">
              {new Date(c.timestamp).toLocaleString()}
            </p>
          </div>
        );
      })}
    </div>
  )}
</div>
    </div>
  );
}

/* -----------------------------------------------------
   METRIC CARD
----------------------------------------------------- */
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 bg-white border rounded shadow-sm text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-gray-600 text-sm mt-1">{label}</p>
    </div>
  );
}
