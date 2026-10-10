"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Bar as ProjectBar } from "@/lib/workspace/progress";

const chartConfig = {
  overdue: { label: "Overdue", color: "var(--destructive)" },
  soon: { label: "Due in 7 days", color: "var(--chart-3)" },
  waiting: { label: "Waiting", color: "var(--chart-1)" },
  later: { label: "Due later", color: "var(--chart-2)" },
  none: { label: "No date", color: "var(--chart-5)" },
} satisfies ChartConfig;

const BUCKETS = ["overdue", "soon", "waiting", "later", "none"] as const;
const ROW_HEIGHT = 34;

export function ProjectBars({ bars }: { bars: ProjectBar[] }) {
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full"
      style={{ height: bars.length * ROW_HEIGHT + 64 }}
      role="img"
      aria-label={`Open tasks for ${bars.length} projects, split by overdue, due in 7 days, waiting, due later and no date`}
    >
      <BarChart data={bars} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} strokeOpacity={0.5} />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="project" width={190} tickLine={false} axisLine={false} interval={0} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-3 justify-end" />} />
        {BUCKETS.map((bucket) => (
          <Bar key={bucket} dataKey={bucket} stackId="open" fill={`var(--color-${bucket})`} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
