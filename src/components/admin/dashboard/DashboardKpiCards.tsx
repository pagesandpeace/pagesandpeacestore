"use client";

import { Card, CardHeader, CardBody } from "@/components/ui/Card";

type Props = {
  totalRevenue: number;
  totalEvents: number;
  totalBookings: number;
  refundRate: number;
  totalSignups: number;
  totalFeedback: number;
  averageRating: number;
};

export default function DashboardKpiCards({
  totalRevenue,
  totalEvents,
  totalBookings,
  refundRate,
  totalSignups,
  totalFeedback,
  averageRating,
}: Props) {
  const cards = [
    {
      label: "Total Revenue",
      value: `£${totalRevenue.toFixed(2)}`,
      color: "text-green-700",
    },
    {
      label: "Total Events",
      value: totalEvents,
      color: "text-blue-700",
    },
    {
      label: "Total Bookings",
      value: totalBookings,
      color: "text-purple-700",
    },
    {
      label: "Refund Rate",
      value: `${refundRate}%`,
      color: "text-red-700",
    },
    {
      label: "Total Signups",
      value: totalSignups,
      color: "text-amber-700",
    },
    {
      label: "Feedback Count",
      value: totalFeedback,
      color: "text-indigo-700",
    },
    {
      label: "Average Rating",
      value: Number.isFinite(averageRating)
        ? `${averageRating.toFixed(1)} / 5`
        : "N/A",
      color: "text-lime-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-7 gap-6">
      {cards.map((item) => (
        <Card key={item.label} className="shadow-sm">
          <CardHeader>
            <p className="font-semibold text-sm text-neutral-600">
              {item.label}
            </p>
          </CardHeader>
          <CardBody>
            <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
