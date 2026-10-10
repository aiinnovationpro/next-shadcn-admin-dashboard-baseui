"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { applyFilter, projectBars, summarize, type TypeFilter } from "@/lib/workspace/progress";
import type { DoneLog, Project, Source, Task } from "@/lib/workspace/reader";

import { DoneChart } from "./done-chart";
import { ProjectBars } from "./project-bars";
import { SummaryCards } from "./summary-cards";

const FILTERS: [TypeFilter, string][] = [
  ["all", "All"],
  ["work", "Work"],
  ["personal", "Personal"],
];

export function ProgressView({
  tasks,
  projects,
  doneLog,
  doneSource,
  now: nowIso,
}: {
  tasks: Task[];
  projects: Project[];
  doneLog: DoneLog;
  doneSource: Source | undefined;
  now: string; // the server's clock, so the server render and the browser agree
}) {
  const [filter, setFilter] = useState<TypeFilter>("all");
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const shown = useMemo(() => applyFilter(filter, projects, tasks, doneLog), [filter, projects, tasks, doneLog]);
  const summary = summarize(shown.tasks, shown.log, now);
  const bars = projectBars(shown.projects, shown.tasks, now);

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        size="sm"
        spacing={0}
        variant="outline"
        aria-label="Filter by project type"
        value={[filter]}
        onValueChange={([next]) => next && setFilter(next as TypeFilter)}
      >
        {FILTERS.map(([value, label]) => (
          <ToggleGroupItem key={value} value={value}>
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {filter !== "all" && shown.projects.length === 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>No projects marked {filter}</CardTitle>
            <CardDescription>
              A project shows under Work or Personal only when its block in PROJECTS.md has a Type of work or personal.
              Projects without one show under All.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <SummaryCards summary={summary} />
          <Card size="sm">
            <CardHeader>
              <CardTitle>Open tasks by project</CardTitle>
              <CardDescription>
                Each task is counted once, in the first group that fits: overdue, due in 7 days, waiting, due later, no
                date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bars.length > 0 ? (
                <ProjectBars bars={bars} />
              ) : (
                <p className="text-muted-foreground text-sm">No open tasks.</p>
              )}
            </CardContent>
          </Card>
          <DoneChart log={shown.log} allProjects={filter === "all"} doneSource={doneSource} now={now} />
        </>
      )}
    </div>
  );
}
