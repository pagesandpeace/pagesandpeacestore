"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Card } from "@/components/ui/Card";

type BookingPoint = {
  month: string;
  value: number;
};

export default function BookingsChart({ data }: { data: BookingPoint[] }) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Event Bookings</h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="#5DA865" fill="#D9F2E3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
