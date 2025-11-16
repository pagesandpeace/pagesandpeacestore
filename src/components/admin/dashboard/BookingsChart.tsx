"use client";

import {
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export default function BookingsChart({ data }: { data: any[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold">Monthly Bookings</h2>
      </CardHeader>
      <CardBody className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#C7A54B"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
