"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ------------------------------------------
   TYPES  
------------------------------------------- */
type Blast = {
  id: string;
  subject: string;
  category: string;
  createdAt: string;
};

type Stats = {
  blastId: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  softBounced: number;
  hardBounced: number;
  complaints: number;
};

/* ------------------------------------------
   PAGE COMPONENT
------------------------------------------- */
export default function NewsletterAnalyticsPage() {
  const [blasts, setBlasts] = useState<Blast[]>([]);
  const [stats, setStats] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const b = await fetch("/api/newsletter/analytics/blasts");
      const s = await fetch("/api/newsletter/analytics/stats");

      const blastsData = await b.json();
      const statsData = await s.json();

      if (blastsData.ok) setBlasts(blastsData.blasts);
      if (statsData.ok) setStats(statsData.stats);

      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-[#59472e]">
        Loading analytics…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-8">
      <h1 className="text-4xl font-semibold text-[#3c2f23]">
        Newsletter Analytics
      </h1>

      {/* SUMMARY CARDS */}
      <SummaryCards stats={stats} />

      {/* TABLE OF BLASTS */}
      <div className="border-t pt-8">
        <h2 className="text-2xl font-semibold text-[#59472e] mb-4">
          Past Email Blasts
        </h2>

        <table className="w-full border rounded bg-white shadow-sm text-sm">
          <thead className="bg-[#FAF6F1] text-[#3c2f23]">
            <tr>
              <th className="p-3 text-left">Subject</th>
              <th className="p-3">Category</th>
              <th className="p-3">Open Rate</th>
              <th className="p-3">Click Rate</th>
              <th className="p-3">Sent</th>
              <th className="p-3">Date</th>
              <th className="p-3"></th>
            </tr>
          </thead>

          <tbody>
            {blasts.map((blast) => {
              const stat = stats.find((s) => s.blastId === blast.id);

              const openRate =
                stat && stat.sent > 0
                  ? Math.round((stat.opened / stat.sent) * 100)
                  : 0;

              const clickRate =
                stat && stat.sent > 0
                  ? Math.round((stat.clicked / stat.sent) * 100)
                  : 0;

              return (
                <tr key={blast.id} className="border-b hover:bg-[#f9f5ef]">
                  <td className="p-3">{blast.subject}</td>

                  <td className="p-3 text-center">
                    <span className="px-2 py-1 rounded-full bg-[#E8F4EC] text-[#3c6e47] text-xs">
                      {blast.category}
                    </span>
                  </td>

                  <td className="p-3 text-center">{openRate}%</td>
                  <td className="p-3 text-center">{clickRate}%</td>

                  <td className="p-3 text-center">
                    {stat ? stat.sent : "-"}
                  </td>

                  <td className="p-3 text-center">
                    {new Date(blast.createdAt).toLocaleDateString()}
                  </td>

                  <td className="p-3 text-right">
                    <Link
                      href={`/dashboard/newsletter/analytics/${blast.id}`}
                      className="text-[#5da865] underline"
                    >
                      View details →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------
   SUMMARY CARDS COMPONENT
------------------------------------------- */
function SummaryCards({ stats }: { stats: Stats[] }) {
  const totalSent = stats.reduce((a, s) => a + s.sent, 0);
  const totalOpened = stats.reduce((a, s) => a + s.opened, 0);
  const totalClicked = stats.reduce((a, s) => a + s.clicked, 0);

  const openRate =
    totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  const clickRate =
    totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard title="Total Sent" value={totalSent} />
      <StatCard title="Open Rate" value={`${openRate}%`} />
      <StatCard title="Click Rate" value={`${clickRate}%`} />
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: any }) {
  return (
    <div className="p-6 bg-white rounded shadow-sm border text-center">
      <p className="text-sm text-[#59472e]">{title}</p>
      <p className="text-3xl font-semibold text-[#3c2f23] mt-1">{value}</p>
    </div>
  );
}
