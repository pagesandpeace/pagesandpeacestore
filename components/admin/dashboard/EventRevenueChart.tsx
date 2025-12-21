"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// ChartPoint type for the data structure
type ChartPoint = {
  month: string;
  value: number;  // Using value as the generic key for both chart types
};

export default function EventRevenueChart({
  data,
}: {
  data: ChartPoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"  // Updated to match the data key
          stroke="#111"
          strokeWidth={3}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
