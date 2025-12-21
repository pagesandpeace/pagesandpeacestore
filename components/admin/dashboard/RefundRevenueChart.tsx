"use client";

import { useEffect } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Card } from "@/components/ui/Card";

export type ChartPoint = {
  month: string;
  value: number;
};

export default function RevenueChart({ data }: { data: ChartPoint[] }) {
  useEffect(() => {
    console.log("📈 RevenueChart data:", data);
  }, [data]);

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Revenue (Last 12 Months)</h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#189458"
              fill="#C7EED9"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
