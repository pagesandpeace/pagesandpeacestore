"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type EmailBlast = {
  id: string;
  subject: string;
  category: string;
  recipientCount: number;
  createdAt: string;
  body: string;
};

const badgeColors: Record<string, string> = {
  event: "bg-blue-100 text-blue-700",
  community: "bg-green-100 text-green-700",
  books: "bg-purple-100 text-purple-700",
  product: "bg-amber-100 text-amber-700",
  cafe: "bg-rose-100 text-rose-700",
  news: "bg-indigo-100 text-indigo-700",
  follow_up: "bg-orange-100 text-orange-700",
  general: "bg-gray-200 text-gray-700",
};

export default function NewsletterHistoryPage() {
  const [blasts, setBlasts] = useState<EmailBlast[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [preview, setPreview] = useState<EmailBlast | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/newsletter/history");
      const data = await res.json();
      if (data.ok) setBlasts(data.blasts.reverse());
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-10">
      <h1 className="text-4xl font-semibold text-[#3c2f23]">
        Newsletter History
      </h1>

      <Link
        href="/admin/newsletter"
        className="px-4 py-2 inline-block bg-[#5DA865] text-white rounded hover:bg-[#4c8d55]"
      >
        ← Back to Newsletter Manager
      </Link>

      {/* Loading */}
      {loading && (
        <p className="text-gray-500 mt-6">Loading history…</p>
      )}

      {/* No data */}
      {!loading && blasts.length === 0 && (
        <p className="text-gray-500 mt-6">No blasts have been sent yet.</p>
      )}

      {/* Table */}
      {!loading && blasts.length > 0 && (
        <div className="overflow-x-auto border rounded bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Sent</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {blasts.map((b) => (
                <tr key={b.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{b.subject}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        badgeColors[b.category] || badgeColors.general
                      }`}
                    >
                      {b.category}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {b.recipientCount}
                  </td>

                  <td className="px-4 py-3">
                    {new Date(b.createdAt).toLocaleString()}
                  </td>

                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    {/* Preview */}
                    <button
                      onClick={() => setPreview(b)}
                      className="px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
                    >
                      Preview
                    </button>

                    {/* View Details */}
                    <Link
                      href={`/admin/newsletter/history/${b.id}`}
                      className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white max-w-2xl w-full rounded shadow-lg overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold">{preview.subject}</h2>
              <button
                onClick={() => setPreview(null)}
                className="text-gray-700 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div
              className="p-4 overflow-y-auto max-h-[70vh] prose prose-sm"
              dangerouslySetInnerHTML={{ __html: preview.body }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
