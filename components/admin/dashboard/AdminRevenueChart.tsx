"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type MonthlyMetric = {
  month: string;
  net_revenue: number;
  shop_revenue: number;
  event_revenue: number;
  refunded_revenue: number;
  event_seats: number;
  signups: number;
};

type ChartKey =
  | "net_revenue"
  | "shop_revenue"
  | "event_revenue"
  | "refunded_revenue"
  | "event_seats"
  | "signups";

const chartConfig = {
  net_revenue: {
    label: "Net Revenue",
    color: "var(--chart-1)",
  },
  shop_revenue: {
    label: "Shop Revenue",
    color: "var(--chart-2)",
  },
  event_revenue: {
    label: "Event Revenue",
    color: "var(--chart-3)",
  },
  refunded_revenue: {
    label: "Refunds",
    color: "var(--chart-4)",
  },
  event_seats: {
    label: "Tickets Sold",
    color: "var(--chart-5)",
  },
  signups: {
    label: "Signups",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function formatMoney(value: number) {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");

  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    "en-GB",
    {
      month: "short",
      year: "2-digit",
    }
  );
}

export default function AdminRevenueChart({
  data,
}: {
  data: MonthlyMetric[];
}) {
  const [activeChart, setActiveChart] =
    React.useState<ChartKey>("net_revenue");

  const totals = React.useMemo(
    () => ({
      net_revenue: data.reduce((sum, row) => sum + Number(row.net_revenue ?? 0), 0),
      shop_revenue: data.reduce((sum, row) => sum + Number(row.shop_revenue ?? 0), 0),
      event_revenue: data.reduce((sum, row) => sum + Number(row.event_revenue ?? 0), 0),
      refunded_revenue: data.reduce(
        (sum, row) => sum + Number(row.refunded_revenue ?? 0),
        0
      ),
      event_seats: data.reduce((sum, row) => sum + Number(row.event_seats ?? 0), 0),
      signups: data.reduce((sum, row) => sum + Number(row.signups ?? 0), 0),
    }),
    [data]
  );

  const isMoneyMetric =
    activeChart === "net_revenue" ||
    activeChart === "shop_revenue" ||
    activeChart === "event_revenue" ||
    activeChart === "refunded_revenue";

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5">
          <CardTitle>Monthly performance</CardTitle>
          <p className="text-sm text-neutral-500">
            Compare revenue, refunds, ticket sales and signups over the last 12
            months.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex">
          {(
            [
              "net_revenue",
              "shop_revenue",
              "event_revenue",
              "refunded_revenue",
              "event_seats",
              "signups",
            ] as ChartKey[]
          ).map((key) => {
            const active = activeChart === key;
            const label = chartConfig[key].label;

            return (
              <button
                key={key}
                data-active={active}
                className="flex min-w-[130px] flex-1 flex-col justify-center gap-1 border-t px-4 py-3 text-left data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0"
                onClick={() => setActiveChart(key)}
                type="button"
              >
                <span className="text-xs text-neutral-500">{label}</span>
                <span className="text-lg font-bold leading-none text-neutral-950">
                  {key.includes("revenue") || key === "refunded_revenue"
                    ? formatMoney(totals[key])
                    : Number(totals[key] ?? 0).toLocaleString("en-GB")}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="px-2 py-6 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[320px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={formatMonth}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[170px]"
                  labelFormatter={(value) => formatMonth(String(value))}
                  formatter={(value) =>
                    isMoneyMetric
                      ? formatMoney(Number(value))
                      : Number(value ?? 0).toLocaleString("en-GB")
                  }
                />
              }
            />
            <Bar
              dataKey={activeChart}
              fill={`var(--color-${activeChart})`}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}