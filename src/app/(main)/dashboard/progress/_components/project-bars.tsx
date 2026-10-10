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
import { BUCKETS, type ProjectBar } from "@/lib/workspace/progress";

// Overdue (destructive) and due in 7 days (amber) keep their meaning. The other three are green, violet and neutral grey,
// so no two series share a hue. Amber is chart-3 in light and chart-2 in dark, hence the per-theme colours.
const chartConfig = {
  overdue: { label: "Overdue", color: "var(--destructive)" },
  soon: { label: "Due in 7 days", theme: { light: "var(--chart-3)", dark: "var(--chart-2)" } },
  waiting: { label: "Waiting", theme: { light: "var(--chart-4)", dark: "var(--chart-3)" } },
  later: { label: "Due later", theme: { light: "var(--color-violet-600)", dark: "var(--color-violet-400)" } },
  none: { label: "No date", color: "var(--chart-5)" },
} satisfies ChartConfig;

const ROW_HEIGHT = 40;
const AXIS_WIDTH = 148;
const MAX_LINE = 22; // characters per line before a name wraps to a second line

// Two lines at most: split at the space nearest the middle, so "Riverside Community Garden Project" reads as
// "Riverside Community" over "Garden Project". Short names stay on one line.
function wrapName(name: string): string[] {
  if (name.length <= MAX_LINE) return [name];
  const middle = name.length / 2;
  const spaces = [...name.matchAll(/ /g)].map((m) => m.index);
  if (spaces.length === 0) return [name];
  const cut = spaces.reduce((best, i) => (Math.abs(i - middle) < Math.abs(best - middle) ? i : best));
  return [name.slice(0, cut), name.slice(cut + 1)];
}

type TickProps = { x?: number; y?: number; payload?: { value: string } };

function ProjectTick({ x = 0, y = 0, payload }: TickProps) {
  const lines = wrapName(payload?.value ?? "");
  return (
    <text x={x} y={y} textAnchor="end" className="fill-muted-foreground">
      {lines.map((line, i) => (
        <tspan key={line} x={x} dy={i === 0 ? `${0.35 - (lines.length - 1) * 0.55}em` : "1.1em"}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

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
            width={AXIS_WIDTH}
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={<ProjectTick />}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(name) => String(name)} />} />
          <ChartLegend
            verticalAlign="top"
            itemSorter={null}
            content={<ChartLegendContent className="mb-3 flex-wrap justify-end gap-y-1" />}
          />
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
