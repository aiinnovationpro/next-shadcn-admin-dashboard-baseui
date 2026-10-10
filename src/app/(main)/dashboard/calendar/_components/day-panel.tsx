import type { ReactNode } from "react";

import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type DayItems, doneNote } from "@/lib/workspace/calendar";
import { addDays, dayLabel } from "@/lib/workspace/progress";
import type { DoneLog, Source, Task } from "@/lib/workspace/reader";

import { BoldText } from "../../_workspace/bold-text";
import { StaleMark } from "../../_workspace/stale-mark";
import { UnreadableSource } from "../../_workspace/workspace-page";

export type Sources = { status?: Source; projects?: Source; done?: Source; journal?: Source };

const unreadable = (s?: Source) => (s && s.state !== "ok" ? s : null);

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-medium text-sm">
        {title}
        {count !== undefined && (
          <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">({count})</span>
        )}
      </h3>
      {children}
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}

// Same facts as a row of the Tasks page: stale mark, headline, waiting on, project, category. A task with context
// opens it on click, like the Tasks page's expandable rows.
function DueRow({ task, past }: { task: Task; past: boolean }) {
  const line = (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {task.stale && <StaleMark />}
      <span className="break-words">{task.headline}</span>
      {task.waitingOn && <Badge variant="secondary">Waiting on {task.waitingOn}</Badge>}
      <span className="text-muted-foreground text-xs">{task.project}</span>
      {task.category && <Badge variant="outline">#{task.category}</Badge>}
      {past && <Badge variant="outline">Past due</Badge>}
    </div>
  );
  if (!task.context) return <li className="py-2 text-sm first:pt-0 last:pb-0">{line}</li>;
  return (
    <li className="py-2 text-sm first:pt-0 last:pb-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
          {line}
        </summary>
        <p className="mt-2 break-words pl-5.5 text-muted-foreground">{task.context}</p>
      </details>
    </li>
  );
}

function relative(day: string, today: string): string | null {
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  if (day === addDays(today, 1)) return "Tomorrow";
  return null;
}

export function DayPanel({
  day,
  today,
  items,
  doneLog,
  sources,
  meetings,
}: {
  day: string;
  today: string;
  items: DayItems;
  doneLog: DoneLog;
  sources: Sources;
  meetings: ReactNode; // today's meetings from the morning cache, rendered on the server
}) {
  const past = day < today;
  const note = doneNote(day, doneLog, today);
  const statusBroken = unreadable(sources.status);
  const projectsBroken = unreadable(sources.projects);
  const doneBroken = sources.done?.state === "unreadable" || sources.done?.state === "offloaded" ? sources.done : null;
  const journalBroken = unreadable(sources.journal);
  const projectLines = items.starts.length + items.finishes.length;
  const empty = items.due.length + items.done.length + items.journal.length + projectLines === 0;
  const anySourceBroken = [statusBroken, projectsBroken, doneBroken, journalBroken].some(Boolean);
  const tag = relative(day, today);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle id="day-panel-title" className="flex flex-wrap items-center gap-2 text-lg">
          <time dateTime={day}>{dayLabel(day, today)}</time>
          {tag && <Badge variant="outline">{tag}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {empty && !anySourceBroken && <Note>Nothing recorded for this day.</Note>}

        {statusBroken ? (
          <UnreadableSource source={statusBroken} />
        ) : (
          items.due.length > 0 && (
            <Section title={past ? "Due, still open" : "Due"} count={items.due.length}>
              <ul className="flex flex-col divide-y">
                {items.due.map((t) => (
                  <DueRow key={`${t.project}-${t.headline}`} task={t} past={past} />
                ))}
              </ul>
            </Section>
          )
        )}

        {doneBroken ? (
          <UnreadableSource source={doneBroken} />
        ) : (
          <>
            {note && (
              <Section title="Done">
                <Note>{note}</Note>
              </Section>
            )}
            {items.done.length > 0 && (
              <Section title="Done" count={items.done.length}>
                <ul className="flex flex-col divide-y">
                  {items.done.map((d) => (
                    <li
                      key={`${d.project}-${d.headline}`}
                      className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 py-2 text-sm first:pt-0 last:pb-0"
                    >
                      <span className="break-words">{d.headline}</span>
                      <span className="text-muted-foreground text-xs">{d.project}</span>
                      {d.category && <Badge variant="outline">#{d.category}</Badge>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}

        {journalBroken ? (
          <UnreadableSource source={journalBroken} />
        ) : (
          items.journal.length > 0 && (
            <Section title="Journal" count={items.journal.length}>
              <ul className="flex list-disc flex-col gap-1.5 break-words pl-5 text-muted-foreground text-sm">
                {items.journal.map((b) => (
                  <li key={b}>
                    <BoldText text={b} />
                  </li>
                ))}
              </ul>
            </Section>
          )
        )}

        {projectsBroken ? (
          <UnreadableSource source={projectsBroken} />
        ) : (
          projectLines > 0 && (
            <Section title="Projects">
              <ul className="flex flex-col gap-1 text-sm">
                {items.starts.map((name) => (
                  <li key={`start-${name}`}>
                    <span className="text-muted-foreground">Starts: </span>
                    {name}
                  </li>
                ))}
                {items.finishes.map((name) => (
                  <li key={`finish-${name}`}>
                    <span className="text-muted-foreground">Finishes: </span>
                    {name}
                  </li>
                ))}
              </ul>
            </Section>
          )
        )}

        <Section title="Meetings">
          {day === today ? (
            meetings
          ) : (
            <Note>
              Meetings are only known for today, from the morning briefing. This app does not fetch your calendar.
            </Note>
          )}
        </Section>
      </CardContent>
    </Card>
  );
}
