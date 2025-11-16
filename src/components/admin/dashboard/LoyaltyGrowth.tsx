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

export default function LoyaltyGrowth({ data }: { data: any[] }) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Loyalty Growth</h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="signups" stroke="#111" fill="#EEE" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
