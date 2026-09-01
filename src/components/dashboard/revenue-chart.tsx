"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const data = [
  { day: "Lun", ca: 3200 },
  { day: "Mar", ca: 4100 },
  { day: "Mer", ca: 3800 },
  { day: "Jeu", ca: 5200 },
  { day: "Ven", ca: 6100 },
  { day: "Sam", ca: 7400 },
  { day: "Dim", ca: 4850 },
];

export function RevenueChart() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Chiffre d&apos;affaires</CardTitle>
          <p className="mt-1 text-sm text-ink/45">7 derniers jours</p>
        </div>
      </CardHeader>
      <CardContent className="h-[260px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="caFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E31C5F" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#E31C5F" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F0E3E6" vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#241A22", fillOpacity: 0.45, fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#241A22", fillOpacity: 0.45, fontSize: 12 }}
              width={48}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #F0E3E6",
                boxShadow: "0 8px 24px rgba(36,26,34,0.06)",
              }}
              formatter={(value) => [
                `${Number(value ?? 0).toLocaleString("fr-MA")} MAD`,
                "CA",
              ]}
            />
            <Area
              type="monotone"
              dataKey="ca"
              stroke="#E31C5F"
              strokeWidth={2.5}
              fill="url(#caFill)"
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
