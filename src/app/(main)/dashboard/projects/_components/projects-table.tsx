"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Project } from "@/lib/workspace/reader";

import { BoldText } from "../../_workspace/bold-text";
import { ExpandRow } from "../../_workspace/expand-row";

const BLOCK_FIELDS: [label: string, key: keyof Project][] = [
  ["Purpose", "purpose"],
  ["Status", "status"],
  ["Stakeholder", "stakeholder"],
  ["Timeline", "timeline"],
  ["Blocker", "blocker"],
  ["Risk", "risk"],
  ["Delta", "delta"],
];

export function ProjectsTable({ projects, openTasks }: { projects: Project[]; openTasks: Record<string, number> }) {
  const [phase, setPhase] = useState("");
  const phases = useMemo(() => [...new Set(projects.map((p) => p.phaseGroup).filter(Boolean))], [projects]);
  const shown = projects.filter((p) => !phase || p.phaseGroup === phase);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect value={phase} onChange={(e) => setPhase(e.target.value)} aria-label="Filter by phase">
          <NativeSelectOption value="">All phases</NativeSelectOption>
          {phases.map((p) => (
            <NativeSelectOption key={p} value={p}>
              {p}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <span className="text-muted-foreground text-sm tabular-nums">
          {shown.length} of {projects.length}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Phase</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Open tasks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((p) => (
            <ExpandRow
              key={p.name}
              colSpan={4}
              detail={
                <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[8rem_1fr]">
                  {BLOCK_FIELDS.filter(([, key]) => p[key]).map(([label, key]) => (
                    <div key={key} className="contents">
                      <dt className="font-medium text-foreground">{label}</dt>
                      <dd>
                        <BoldText text={String(p[key])} />
                      </dd>
                    </div>
                  ))}
                </dl>
              }
            >
              <TableCell className="whitespace-normal font-medium">
                <div className="flex flex-wrap items-center gap-1.5">
                  {p.name}
                  {p.hasBlocker && <Badge variant="destructive">Blocker</Badge>}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge variant="outline">{p.phaseGroup || p.phase}</Badge>
              </TableCell>
              <TableCell className="max-w-xl whitespace-normal text-muted-foreground">
                <BoldText text={p.statusFirstSentence} />
              </TableCell>
              <TableCell className="tabular-nums">
                {openTasks[p.name] ? (
                  <Link
                    href={`/dashboard/tasks?project=${encodeURIComponent(p.name)}`}
                    className="underline underline-offset-4"
                  >
                    {openTasks[p.name]}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
            </ExpandRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
