"use client";

import { Fragment, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDay } from "@/lib/workspace/dates";
import type { Task } from "@/lib/workspace/reader";

import { ExpandRow } from "../../_workspace/expand-row";
import { StaleMark } from "../../_workspace/stale-mark";

type Sort = "project" | "due";

export function TasksTable({ tasks, initialProject }: { tasks: Task[]; initialProject: string }) {
  const [project, setProject] = useState(initialProject);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<Sort>("project");

  const projects = useMemo(() => [...new Set(tasks.map((t) => t.project))], [tasks]);
  const categories = useMemo(() => [...new Set(tasks.map((t) => t.category).filter((c): c is string => !!c))], [tasks]);

  const showProject = sort === "due";
  const columnCount = showProject ? 4 : 3;
  const shown = tasks.filter((t) => (!project || t.project === project) && (!category || t.category === category));
  const ordered =
    sort === "due" ? [...shown].sort((a, b) => (a.due ?? "9999-12-31").localeCompare(b.due ?? "9999-12-31")) : shown;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect value={project} onChange={(e) => setProject(e.target.value)} aria-label="Filter by project">
          <NativeSelectOption value="">All projects</NativeSelectOption>
          {projects.map((p) => (
            <NativeSelectOption key={p} value={p}>
              {p}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <NativeSelectOption value="">All categories</NativeSelectOption>
          {categories.map((c) => (
            <NativeSelectOption key={c} value={c}>
              #{c}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort tasks">
          <NativeSelectOption value="project">Grouped by project</NativeSelectOption>
          <NativeSelectOption value="due">Sorted by due date</NativeSelectOption>
        </NativeSelect>
        <span className="text-muted-foreground text-sm tabular-nums">
          {shown.length} of {tasks.length}
        </span>
      </div>

      <Table>
        {/* grouped by project, the group header already says the project */}
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            {showProject && <TableHead>Project</TableHead>}
            <TableHead>Category</TableHead>
            <TableHead>Due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map((t, i) => (
            <Fragment key={`${t.project}-${t.headline}`}>
              {sort === "project" && (i === 0 || ordered[i - 1].project !== t.project) && (
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={columnCount} className="font-medium">
                    {t.project}{" "}
                    <span className="font-normal text-muted-foreground tabular-nums">
                      ({ordered.filter((o) => o.project === t.project).length})
                    </span>
                  </TableCell>
                </TableRow>
              )}
              <ExpandRow colSpan={columnCount} detail={t.context || null}>
                <TableCell className="max-w-xl whitespace-normal">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {t.stale && <StaleMark />}
                    <span>{t.headline}</span>
                    {t.waitingOn && <Badge variant="secondary">Waiting on {t.waitingOn}</Badge>}
                  </div>
                </TableCell>
                {showProject && <TableCell className="text-muted-foreground">{t.project}</TableCell>}
                <TableCell>{t.category ? <Badge variant="outline">#{t.category}</Badge> : null}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {t.due && (
                    <span className="flex items-center gap-1.5">
                      {formatDay(t.due)}
                      {t.dueStatus === "overdue" && <Badge variant="destructive">Overdue</Badge>}
                      {t.dueStatus === "today" && <Badge>Due today</Badge>}
                    </span>
                  )}
                </TableCell>
              </ExpandRow>
            </Fragment>
          ))}
        </TableBody>
      </Table>
      {shown.length === 0 && tasks.length > 0 && (
        <p className="text-muted-foreground text-sm">No task matches these filters.</p>
      )}
    </div>
  );
}
