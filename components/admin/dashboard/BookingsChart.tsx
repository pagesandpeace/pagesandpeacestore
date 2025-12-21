"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { Card } from "@/components/ui/Card";
import type { ChartPoint } from "./RevenueChart";

export default function BookingsChart({ data }: { data: ChartPoint[] }) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Event Bookings</h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#4B79FF"
              fill="#DDE4FF"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
