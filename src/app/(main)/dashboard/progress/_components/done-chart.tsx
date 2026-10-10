"use client";

import { format, parseISO } from "date-fns";
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatDay } from "@/lib/workspace/dates";
import { historyStart, weeklySeries } from "@/lib/workspace/progress";
import type { DoneLog, Source } from "@/lib/workspace/reader";

const chartConfig = {
  done: { label: "Done per week", color: "var(--chart-4)" },
  open: { label: "Open tasks", color: "var(--chart-1)" },
} satisfies ChartConfig;

const SOURCE_NOTE: Record<Source["state"], string> = {
  ok: "",
  missing: "does not exist yet",
  unreadable: "is empty or cannot be read",
  offloaded: "is offloaded by iCloud and not downloaded",
};

export function DoneChart({
  log,
  allProjects,
  doneSource,
  now,
}: {
  log: DoneLog;
  allProjects: boolean; // /eod's open counts cover every project, so they are drawn only on the unfiltered view
  doneSource: Source | undefined;
  now: Date;
}) {
  const series = weeklySeries(log, now);

  if (series.length === 0) {
    // No done entries (or none for this filter): say when the history starts instead of drawing an empty axis.
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Done per week</CardTitle>
          <CardDescription>
            {doneSource && doneSource.state !== "ok" && `DONE.md ${SOURCE_NOTE[doneSource.state]}. `}Done history starts{" "}
            {formatDay(historyStart(log, now), now)}.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card size="sm" className="@container/card">
      <CardHeader>
        <CardTitle>Done per week</CardTitle>
        <CardDescription>
          Tasks done each calendar week (Monday to Sunday)
          {allProjects
            ? ", against the open count /eod recorded that week."
            : ". The open count covers every project, so it shows under All only."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-72 w-full"
          role="img"
          aria-label={`Tasks done per week over ${series.length} weeks`}
        >
          <ComposedChart data={series} margin={{ top: 0, left: 0, right: 12 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.5} />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(week: string) => format(parseISO(week), "MMM d")}
            />
            <YAxis yAxisId="done" allowDecimals={false} tickLine={false} axisLine={false} width={32} />
            {allProjects && (
              <YAxis
                yAxisId="open"
                orientation="right"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
              />
            )}
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(week) => `Week of ${formatDay(String(week), now)}`}
                />
              }
            />
            <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-3 justify-end" />} />
            <Line
              yAxisId="done"
              dataKey="done"
              type="monotone"
              stroke="var(--color-done)"
              strokeWidth={1.6}
              dot={{ r: 3 }}
            />
            {allProjects && (
              <Line
                yAxisId="open"
                dataKey="open"
                type="monotone"
                stroke="var(--color-open)"
                strokeWidth={1.6}
                dot={{ r: 3 }}
                connectNulls
              />
            )}
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
