"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "cn";
import { Check, ChevronLeft, ChevronRight, Flag, ListTodo } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type DayItems, dayItems, indexDays, monthOf, monthWeeks, shiftMonth } from "@/lib/workspace/calendar";
import { addDays } from "@/lib/workspace/progress";
import type { DoneLog, JournalEntry, Project, Task } from "@/lib/workspace/reader";

import { DayPanel, type Sources } from "./day-panel";

const WEEKDAYS = [
  ["Mon", "Monday"],
  ["Tue", "Tuesday"],
  ["Wed", "Wednesday"],
  ["Thu", "Thursday"],
  ["Fri", "Friday"],
  ["Sat", "Saturday"],
  ["Sun", "Sunday"],
];

// Built from the parts of a YYYY-MM-DD string, never from an instant, so no time zone can move the label.
const parts = (iso: string) => iso.split("-").map(Number);
const monthTitle = (month: string) => {
  const [y, m] = parts(month);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
};
const longDay = (iso: string) => {
  const [y, m, d] = parts(iso);
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(
    new Date(y, m - 1, d),
  );
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// What a screen reader hears for a cell: the same facts the markers show, in words.
function cellLabel(day: string, items: DayItems, today: string) {
  const said = [
    items.due.length > 0 && `${plural(items.due.length, "task", "tasks")} due`,
    items.done.length > 0 && `${items.done.length} done`,
    items.journal.length > 0 && "journal entry",
    ...items.starts.map((n) => `${n} starts`),
    ...items.finishes.map((n) => `${n} finishes`),
  ].filter(Boolean);
  return `${longDay(day)}${day === today ? ", today" : ""}${said.length > 0 ? `: ${said.join(", ")}` : ""}`;
}

function Marker({ icon, count }: { icon: ReactNode; count?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[0.7rem] text-muted-foreground tabular-nums leading-none">
      {icon}
      {count}
    </span>
  );
}

export function CalendarView({
  today,
  tasks,
  projects,
  doneLog,
  journal,
  sources,
  meetings,
}: {
  today: string; // YYYY-MM-DD from the server, so the server render and the browser agree on the day
  tasks: Task[];
  projects: Project[];
  doneLog: DoneLog;
  journal: JournalEntry[];
  sources: Sources;
  meetings: ReactNode;
}) {
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(monthOf(today));
  const wantFocus = useRef<boolean>(false); // set by the arrow keys: move focus to the new day once it has rendered

  const index = useMemo(
    () => indexDays({ tasks, doneLog, journal, projects }, today),
    [tasks, doneLog, journal, projects, today],
  );
  const weeks = useMemo(() => monthWeeks(month), [month]);
  // the one day Tab lands on: the selected day, or the 1st when another month is on screen
  const tabStop = weeks.flat().includes(selected) ? selected : `${month}-01`;

  useEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    document.getElementById(`day-${selected}`)?.focus();
  }, [selected]);

  const pick = (day: string) => {
    setSelected(day);
    setMonth(monthOf(day)); // a neighbouring month's day, picked from this grid, brings its month with it
  };

  const onKey = (e: KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    wantFocus.current = true;
    pick(addDays(selected, step));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card size="sm" className="self-start">
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto font-medium text-lg" aria-live="polite">
              {monthTitle(month)}
            </h2>
            <Button variant="outline" size="sm" onClick={() => pick(today)}>
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous month"
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronRight />
            </Button>
          </div>

          <fieldset onKeyDown={onKey} className="m-0 flex min-w-0 flex-col gap-px border-0 p-0">
            <legend className="sr-only">{monthTitle(month)}</legend>
            <div className="grid grid-cols-7 gap-px">
              {WEEKDAYS.map(([short, long]) => (
                <abbr key={short} title={long} className="py-1 text-center text-muted-foreground text-xs no-underline">
                  {short}
                </abbr>
              ))}
            </div>
            {weeks.map((week) => (
              <div key={week[0]} className="grid grid-cols-7 gap-px">
                {week.map((day) => {
                  const items = dayItems(index, day);
                  const isSelected = day === selected;
                  const inMonth = monthOf(day) === month;
                  const projectMarks = items.starts.length + items.finishes.length;
                  return (
                    <button
                      key={day}
                      id={`day-${day}`}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={cellLabel(day, items, today)}
                      tabIndex={day === tabStop ? 0 : -1}
                      onClick={() => pick(day)}
                      className={cn(
                        "flex min-h-14 min-w-0 flex-col items-start gap-1 rounded-md border p-1 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring sm:min-h-20 sm:p-1.5",
                        !inMonth && "text-muted-foreground opacity-60",
                        isSelected && "border-primary bg-accent",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-sm tabular-nums",
                          day === today && "bg-primary font-medium text-primary-foreground",
                        )}
                      >
                        {Number(day.slice(8))}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5" aria-hidden="true">
                        {items.due.length > 0 && (
                          <Marker icon={<ListTodo className="size-3" />} count={items.due.length} />
                        )}
                        {items.done.length > 0 && (
                          <Marker icon={<Check className="size-3" />} count={items.done.length} />
                        )}
                        {items.journal.length > 0 && <span className="size-1.5 rounded-full bg-foreground/60" />}
                        {projectMarks > 0 && <Marker icon={<Flag className="size-3" />} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </fieldset>

          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
            <span className="inline-flex items-center gap-1">
              <ListTodo className="size-3" /> tasks due
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="size-3" /> done
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-foreground/60" /> journal entry
            </span>
            <span className="inline-flex items-center gap-1">
              <Flag className="size-3" /> project starts or finishes
            </span>
          </p>
        </CardContent>
      </Card>

      <DayPanel
        day={selected}
        today={today}
        items={dayItems(index, selected)}
        doneLog={doneLog}
        sources={sources}
        meetings={meetings}
      />
    </div>
  );
}
