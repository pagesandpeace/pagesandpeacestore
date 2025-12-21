"use client";

import { Card, CardHeader, CardBody } from "@/components/ui/Card";

/* --------------------------------------------------
   PROPS (ALIGNED WITH ADMIN PAGE)
-------------------------------------------------- */
type Props = {
  totalRevenue: number;
  netRevenue: number;
  refundedRevenue: number;
  refundRate: number;

  shopRevenue: number;
  eventRevenue: number;

  totalEvents: number;
  totalBookings: number;
  totalSignups: number;

  totalFeedback: number;
  averageRating: number;
  totalEmailSubscribers: number;
};

export default function DashboardKpiCards({
  totalRevenue = 0,
  netRevenue = 0,
  refundedRevenue = 0,
  refundRate = 0,

  shopRevenue = 0,
  eventRevenue = 0,

  totalEvents = 0,
  totalBookings = 0,
  totalSignups = 0,

  totalFeedback = 0,
  averageRating = 0,
  totalEmailSubscribers = 0,
}: Props) {
  const cards = [
    /* ---------------- Revenue ---------------- */
    {
      label: "Gross Revenue",
      value: `£${Number(totalRevenue).toFixed(2)}`,
      color: "text-green-700",
    },
    {
      label: "Net Revenue",
      value: `£${Number(netRevenue).toFixed(2)}`,
      color: "text-emerald-700",
    },
    {
      label: "Refunded",
      value: `£${Number(refundedRevenue).toFixed(2)}`,
      color: "text-red-600",
    },
    {
      label: "Refund Rate",
      value: `${(refundRate * 100).toFixed(1)}%`,
      color: "text-red-500",
    },

    /* ---------------- Breakdown ---------------- */
    {
      label: "Shop Revenue",
      value: `£${Number(shopRevenue).toFixed(2)}`,
      color: "text-indigo-700",
    },
    {
      label: "Event Revenue",
      value: `£${Number(eventRevenue).toFixed(2)}`,
      color: "text-purple-700",
    },

    /* ---------------- Activity ---------------- */
    {
      label: "Total Events",
      value: totalEvents,
      color: "text-blue-700",
    },
    {
      label: "Total Bookings",
      value: totalBookings,
      color: "text-violet-700",
    },
    {
      label: "Total Signups",
      value: totalSignups,
      color: "text-amber-700",
    },

    /* ---------------- Quality ---------------- */
    {
      label: "Feedback Count",
      value: totalFeedback,
      color: "text-orange-700",
    },
    {
      label: "Average Rating",
      value: Number.isFinite(averageRating)
        ? `${averageRating.toFixed(1)} / 5`
        : "N/A",
      color: "text-lime-700",
    },
    {
      label: "Email Subscribers",
      value: totalEmailSubscribers,
      color: "text-sky-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
      {cards.map((item) => (
        <Card key={item.label} className="shadow-sm">
          <CardHeader>
            <p className="font-semibold text-sm text-neutral-600">
              {item.label}
            </p>
          </CardHeader>
          <CardBody>
            <p className={`text-3xl font-bold ${item.color}`}>
              {item.value}
            </p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
