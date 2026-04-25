"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

type MetricBlock = {
  total_revenue?: number;
  net_revenue?: number;
  refunded_revenue?: number;
  refund_rate?: number;
  shop_revenue?: number;
  event_revenue?: number;
  event_bookings?: number;
  event_seats?: number;
  signups?: number;
};

type MonthChange = {
  total_revenue_pct?: number | null;
  net_revenue_pct?: number | null;
  refunded_revenue_pct?: number | null;
  shop_revenue_pct?: number | null;
  event_revenue_pct?: number | null;
  event_bookings_pct?: number | null;
  event_seats_pct?: number | null;
  signups_pct?: number | null;
};

type TotalsBlock = MetricBlock & {
  total_events?: number;
  total_signups?: number;
};

type Props = {
  totals: TotalsBlock;
  currentMonth: MetricBlock;
  previousMonth: MetricBlock;
  monthChange: MonthChange;

  totalFeedback: number;
  averageRating: number;
  totalEmailSubscribers: number;
};

function money(value: number | undefined) {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

function numberValue(value: number | undefined) {
  return Number(value ?? 0).toLocaleString("en-GB");
}

function percent(value: number | undefined) {
  return `${(Number(value ?? 0) * 100).toFixed(1)}%`;
}

function DeltaBadge({ value }: { value?: number | null }) {
  if (value === null || value === undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500">
        <ArrowRight className="h-3 w-3" />
        No previous data
      </span>
    );
  }

  const isPositive = value > 0;
  const isNeutral = value === 0;

  const className = isNeutral
    ? "text-neutral-500"
    : isPositive
      ? "text-emerald-700"
      : "text-red-600";

  const Icon = isNeutral ? ArrowRight : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value * 100).toFixed(1)}% vs last month
    </span>
  );
}

export default function DashboardKpiCards({
  totals,
  currentMonth,
  monthChange,
  totalFeedback = 0,
  averageRating = 0,
  totalEmailSubscribers = 0,
}: Props) {
  const primaryCards = [
    {
      label: "Revenue this month",
      value: money(currentMonth.total_revenue),
      delta: monthChange.total_revenue_pct,
    },
    {
      label: "Net revenue this month",
      value: money(currentMonth.net_revenue),
      delta: monthChange.net_revenue_pct,
    },
    {
      label: "Shop revenue",
      value: money(currentMonth.shop_revenue),
      delta: monthChange.shop_revenue_pct,
    },
    {
      label: "Event revenue",
      value: money(currentMonth.event_revenue),
      delta: monthChange.event_revenue_pct,
    },
    {
      label: "Refund rate",
      value: percent(currentMonth.refund_rate),
      delta: monthChange.refunded_revenue_pct,
    },
    {
      label: "Tickets sold",
      value: numberValue(currentMonth.event_seats),
      delta: monthChange.event_seats_pct,
    },
  ];

  const secondaryCards = [
    {
      label: "All-time net revenue",
      value: money(totals.net_revenue),
    },
    {
      label: "All-time bookings",
      value: numberValue(totals.event_bookings),
    },
    {
      label: "Total events",
      value: numberValue(totals.total_events),
    },
    {
      label: "Total signups",
      value: numberValue(totals.total_signups),
    },
    {
      label: "Email subscribers",
      value: numberValue(totalEmailSubscribers),
    },
    {
      label: "Average rating",
      value: Number.isFinite(averageRating)
        ? `${averageRating.toFixed(1)} / 5`
        : "N/A",
      helper: `${totalFeedback} feedback responses`,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">This month</h2>
          <p className="text-sm text-neutral-500">
            Current month performance compared with last month.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {primaryCards.map((item) => (
            <Card key={item.label} className="shadow-sm">
              <CardHeader className="border-b-0 pb-2">
                <p className="text-sm font-medium text-neutral-500">
                  {item.label}
                </p>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-3xl font-bold tracking-tight text-neutral-950">
                  {item.value}
                </p>
                <div className="mt-2">
                  <DeltaBadge value={item.delta} />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Business totals</h2>
          <p className="text-sm text-neutral-500">
            Lifetime figures and quality signals.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {secondaryCards.map((item) => (
            <Card key={item.label} className="shadow-sm">
              <CardHeader className="border-b-0 pb-2">
                <p className="text-sm font-medium text-neutral-500">
                  {item.label}
                </p>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-3xl font-bold tracking-tight text-neutral-950">
                  {item.value}
                </p>
                {item.helper && (
                  <p className="mt-2 text-xs text-neutral-500">{item.helper}</p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}