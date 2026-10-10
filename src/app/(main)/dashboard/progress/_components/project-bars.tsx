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
import type { ProjectBar } from "@/lib/workspace/progress";

const chartConfig = {
  overdue: { label: "Overdue", color: "var(--destructive)" },
  soon: { label: "Due in 7 days", color: "var(--chart-3)" },
  waiting: { label: "Waiting", color: "var(--chart-1)" },
  later: { label: "Due later", color: "var(--chart-2)" },
  none: { label: "No date", color: "var(--chart-5)" },
} satisfies ChartConfig;

const BUCKETS = ["overdue", "soon", "waiting", "later", "none"] as const;
const ROW_HEIGHT = 34;
const MAX_LABEL = 20; // characters shown on the axis; the tooltip carries the full name

const shorten = (name: string) => (name.length > MAX_LABEL ? `${name.slice(0, MAX_LABEL - 1)}…` : name);

export function ProjectBars({ bars }: { bars: ProjectBar[] }) {
  return (
    <>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full"
        style={{ height: bars.length * ROW_HEIGHT + 64 }}
        role="img"
        aria-label={`Open tasks for ${bars.length} projects, split by overdue, due in 7 days, waiting, due later and no date; the same numbers are in the table below`}
      >
        <BarChart data={bars} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} strokeOpacity={0.5} />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="project"
            width={128}
            tickLine={false}
            axisLine={false}
            interval={0}
            tickFormatter={shorten}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(name) => String(name)} />} />
          <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-3 justify-end" />} />
          {BUCKETS.map((bucket) => (
            <Bar key={bucket} dataKey={bucket} stackId="open" fill={`var(--color-${bucket})`} />
          ))}
        </BarChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>Open tasks by project</caption>
        <thead>
          <tr>
            <th scope="col">Project</th>
            {BUCKETS.map((b) => (
              <th key={b} scope="col">
                {chartConfig[b].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.project}>
              <th scope="row">{bar.project}</th>
              {BUCKETS.map((b) => (
                <td key={b}>{bar[b]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
