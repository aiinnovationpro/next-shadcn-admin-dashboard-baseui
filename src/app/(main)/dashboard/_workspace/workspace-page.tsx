import type { ReactNode } from "react";

import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAge } from "@/lib/workspace/dates";
import type { Snapshot, Source } from "@/lib/workspace/reader";

import { LiveRefresh } from "./live-refresh";

const MAIL_STATE = ".mail_cache.json";

// The mail state only feeds the Today view (phase 2), so a missing one is a plain fact here, not an alarm.
function sourceVariant(s: Source) {
  if (s.state === "ok") return "outline";
  return s.name === MAIL_STATE && s.state === "missing" ? "secondary" : "destructive";
}

const WHY: Record<Source["state"], string> = {
  ok: "",
  missing: "does not exist",
  unreadable: "exists but cannot be read",
  offloaded: "was offloaded by iCloud and is not downloaded",
};

export function WorkspaceNotFound() {
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>The Akutu_2 workspace folder was not found</AlertTitle>
      <AlertDescription>
        The folder named in AKUTU_WORKSPACE does not exist or has moved. Nothing is shown because nothing can be read,
        which is different from an empty workspace.
      </AlertDescription>
    </Alert>
  );
}

// The frame every view sits in: counts, honest source ages, and the failure states that must never read as "nothing to do".
export function WorkspacePage({
  snap,
  title,
  needs,
  children,
}: {
  snap: Snapshot;
  title: string;
  needs: ("STATUS.md" | "PROJECTS.md")[];
  children: ReactNode;
}) {
  if (!snap.workspaceFound) return <WorkspaceNotFound />;

  const isOk = (name: string) => snap.sources.find((s) => s.name === name)?.state === "ok";
  const statusOk = isOk("STATUS.md");
  const projectsOk = isOk("PROJECTS.md");
  const broken = needs.map((n) => snap.sources.find((s) => s.name === n)).filter((s) => s && s.state !== "ok");

  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        <div className="flex flex-wrap gap-1.5">
          {snap.sources.map((s) => (
            <Badge key={s.name} variant={sourceVariant(s)}>
              {s.name === MAIL_STATE ? "Mail state" : s.name}:{" "}
              {s.state === "ok" ? formatAge(s.ageMinutes ?? 0) : s.state}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Count label="Tasks open" value={statusOk ? snap.tasks.length : null} />
        <Count label="Inbox items" value={statusOk ? snap.inbox.length : null} />
        <Count label="Projects" value={projectsOk ? snap.projects.length : null} />
      </div>

      {broken.length > 0 ? broken.map((s) => s && <UnreadableSource key={s.name} source={s} />) : children}

      {snap.notUnderstood.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Not understood ({snap.notUnderstood.length})</CardTitle>
            <CardDescription>Lines the reader could not place. They are shown as written, not dropped.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 font-mono text-xs">
              {snap.notUnderstood.map((n) => (
                <li key={`${n.source}${n.section}${n.line}`}>
                  <span className="text-muted-foreground">
                    {n.source} / {n.section}:
                  </span>{" "}
                  {n.line}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// The honest message for a source that is not there or cannot be read; sections that read one source on their own reuse it.
export function UnreadableSource({ source }: { source: Source }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>{source.name} cannot be shown</AlertTitle>
      <AlertDescription>
        {source.name} {WHY[source.state]}. This page is not empty, it is unreadable.
      </AlertDescription>
    </Alert>
  );
}

// null means the source could not be read: a dash, never a zero that looks like "nothing to do".
function Count({ label, value }: { label: string; value: number | null }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value ?? "–"}</CardTitle>
      </CardHeader>
    </Card>
  );
}
