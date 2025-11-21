import { db } from "@/lib/db";
import { emailBlasts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BlastDetailPage({
  params,
}: {
  params: { blastId: string };
}) {
  const blastId = params.blastId;

  const blast = (
    await db.select().from(emailBlasts).where(eq(emailBlasts.id, blastId))
  )[0];

  if (!blast) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <p className="text-red-600 text-lg">Blast not found.</p>
        <Link href="/admin/newsletter/history" className="underline text-blue-600">
          Back to History
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-8">

      {/* Back link */}
      <Link
        href="/admin/newsletter/history"
        className="px-4 py-2 inline-block bg-[#5DA865] text-white rounded hover:bg-[#4c8d55]"
      >
        ← Back to History
      </Link>

      {/* Page Title */}
      <h1 className="text-3xl font-bold text-[#3c2f23]">
        Newsletter Blast Details
      </h1>

      {/* INFO CARD */}
      <div className="p-6 bg-white border rounded shadow space-y-3">

        <p className="text-xl font-semibold text-[#3c2f23]">
          {blast.subject}
        </p>

        <p className="text-sm text-gray-700">
          Category:{" "}
          <span className="font-medium capitalize">{blast.category}</span>
        </p>

        <p className="text-sm text-gray-700">
          Sent:{" "}
          {new Date(blast.createdAt).toLocaleString()}
        </p>

        <p className="text-sm text-gray-700">
          Recipients:{" "}
          {blast.recipientCount}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">

          {/* Duplicate into editor */}
          <Link
            href={{
              pathname: "/admin/newsletter",
              query: {
                subject: blast.subject,
                body: blast.body,
                category: blast.category,
              },
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Duplicate in Editor
          </Link>

          {/* Resend to custom list */}
          <Link
            href={`/admin/newsletter?resend=${blast.id}`}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-black"
          >
            Resend to Custom Recipients
          </Link>
        </div>
      </div>

      {/* EMAIL PREVIEW */}
      <div className="border rounded bg-white shadow p-6">
        <h2 className="text-xl mb-4 font-semibold text-[#3c2f23]">
          Email Preview
        </h2>

        <div
          className="prose max-w-none bg-white p-4 border rounded"
          dangerouslySetInnerHTML={{
            __html: blast.body,
          }}
        />
      </div>
    </div>
  );
}
