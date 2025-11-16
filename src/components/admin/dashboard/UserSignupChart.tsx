"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { Card, CardHeader, CardBody } from "@/components/ui/Card";

type SignupData = {
  month: string;
  count: number;
};

export default function UserSignupChart({ data }: { data: SignupData[] }) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <h2 className="text-lg font-semibold">User Signups per Month</h2>
      </CardHeader>

      <CardBody>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip
                wrapperStyle={{
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#5DA865"
                strokeWidth={3}
                dot={{ r: 5, fill: "#5DA865" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
