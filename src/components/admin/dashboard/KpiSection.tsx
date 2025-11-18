"use client";

import { Card } from "@/components/ui/Card";

type KPIData = {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalBookings: number;
  loyaltySignups: number;
};

export default function KPISection({ data }: { data: KPIData }) {
  const cards = [
    { label: "Today’s Revenue", value: `£${data.todayRevenue.toFixed(2)}` },
    { label: "This Week", value: `£${data.weekRevenue.toFixed(2)}` },
    { label: "This Month", value: `£${data.monthRevenue.toFixed(2)}` },
    { label: "Total Bookings", value: data.totalBookings.toString() },
    { label: "Loyalty Signups (30 days)", value: data.loyaltySignups.toString() },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((c) => (
        <Card key={c.label} className="p-6 text-center">
          <p className="text-sm text-neutral-600">{c.label}</p>
          <p className="text-3xl font-bold mt-2">{c.value}</p>
        </Card>
      ))}
    </div>
  );
}
