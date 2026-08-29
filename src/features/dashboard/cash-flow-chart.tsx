"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatSek } from "@/lib/money";

import { cashFlow } from "./dashboard-data";

const chartConfig = {
  in: { label: "In", color: "var(--chart-4)" },
  out: { label: "Ut", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function CashFlowChart() {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <AreaChart data={cashFlow} margin={{ left: -18, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-in)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-in)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-out)" stopOpacity={0.25} />
            <stop
              offset="95%"
              stopColor="var(--color-out)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex min-w-32 items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {chartConfig[name as keyof typeof chartConfig]?.label}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatSek(Number(value) * 100)}
                  </span>
                </div>
              )}
            />
          }
        />
        <Area
          dataKey="in"
          type="monotone"
          fill="url(#income)"
          stroke="var(--color-in)"
          strokeWidth={2}
        />
        <Area
          dataKey="out"
          type="monotone"
          fill="url(#expenses)"
          stroke="var(--color-out)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
