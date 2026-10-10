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
import { dayLabel, doneHistoryNote, MAX_WEEKS, weeklySeries } from "@/lib/workspace/progress";
import type { DoneLog, Source } from "@/lib/workspace/reader";

import { UnreadableSource } from "../../_workspace/workspace-page";

const chartConfig = {
  done: { label: "Done per week", color: "var(--chart-4)" },
  open: { label: "Open tasks", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function DoneChart({
  fullLog,
  log,
  allProjects,
  doneSource,
  today,
}: {
  fullLog: DoneLog; // the whole log, whatever the filter: where the history starts never depends on it
  log: DoneLog; // the log under the current filter
  allProjects: boolean; // /eod's open counts cover every project, so they are drawn only on the unfiltered view
  doneSource: Source | undefined;
  today: string;
}) {
  // A DONE.md that is missing is an empty log. One that exists but cannot be read is not "no history".
  if (doneSource && (doneSource.state === "unreadable" || doneSource.state === "offloaded")) {
    return <UnreadableSource source={doneSource} />;
  }

  const series = weeklySeries(log, today);

  if (series.length === 0) {
    // Nothing to draw: say what is true instead of drawing an empty axis.
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Done per week</CardTitle>
          <CardDescription>{doneHistoryNote(fullLog, log, today)}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card size="sm" className="@container/card">
      <CardHeader>
        <CardTitle>Done per week</CardTitle>
        <CardDescription>
          Tasks done each calendar week (Monday to Sunday), for the last {MAX_WEEKS} weeks at most
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
          aria-label={`Tasks done per week over ${series.length} weeks; the same numbers are in the table below`}
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
                  labelFormatter={(week) => `Week of ${dayLabel(String(week), today)}`}
                />
              }
            />
            <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-3 justify-end" />} />
            {/* linear: a smoothed curve would suggest values between the weeks */}
            <Line
              yAxisId="done"
              dataKey="done"
              type="linear"
              stroke="var(--color-done)"
              strokeWidth={1.6}
              dot={{ r: 3 }}
            />
            {allProjects && (
              <Line
                yAxisId="open"
                dataKey="open"
                type="linear"
                stroke="var(--color-open)"
                strokeWidth={1.6}
                dot={{ r: 3 }}
                connectNulls
              />
            )}
          </ComposedChart>
        </ChartContainer>
        <table className="sr-only">
          <caption>Tasks done per week</caption>
          <thead>
            <tr>
              <th scope="col">Week of</th>
              <th scope="col">Done</th>
              {allProjects && <th scope="col">Open tasks recorded</th>}
            </tr>
          </thead>
          <tbody>
            {series.map((w) => (
              <tr key={w.week}>
                <th scope="row">{dayLabel(w.week, today)}</th>
                <td>{w.done}</td>
                {allProjects && <td>{w.open ?? "not recorded"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
