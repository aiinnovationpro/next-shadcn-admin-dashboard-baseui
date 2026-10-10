import { addDays, dayLabel } from "./progress.ts";
import type { DoneEntry, DoneLog, JournalEntry, Project, Task } from "./reader.ts";

// Everything here takes days as YYYY-MM-DD strings and months as YYYY-MM, and `today` comes from the server, so the
// grid, the markers and the panel can never disagree about which day it is.

export type DayItems = {
  due: Task[]; // open tasks due that day (for a past day: still open)
  done: DoneEntry[];
  journal: string[]; // bullets, raw markdown text
  starts: string[]; // names of the projects that start that day
  finishes: string[];
};

export type DayIndex = Record<string, DayItems>;

const emptyDay = (): DayItems => ({ due: [], done: [], journal: [], starts: [], finishes: [] });

// One pass over everything the Calendar knows, keyed by day. A day nothing mentions has no key.
export function indexDays(
  src: { tasks: Task[]; doneLog: DoneLog; journal: JournalEntry[]; projects: Project[] },
  today: string,
): DayIndex {
  const index: DayIndex = {};
  const at = (day: string) => {
    index[day] ??= emptyDay();
    return index[day];
  };
  for (const t of src.tasks) if (t.due) at(t.due).due.push(t);
  for (const e of src.doneLog.done) if (e.date <= today) at(e.date).done.push(e); // none can have happened yet
  for (const e of src.journal) at(e.date).journal.push(...e.bullets);
  for (const p of src.projects) {
    if (p.start) at(p.start).starts.push(p.name);
    if (p.finish) at(p.finish).finishes.push(p.name);
  }
  return index;
}

export const dayItems = (index: DayIndex, day: string): DayItems => index[day] ?? emptyDay();

export const monthOf = (day: string) => day.slice(0, 7);

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

// The weeks that show a month, Monday first, 7 days each; the first and last week hold the neighbouring months' days.
export function monthWeeks(month: string): string[][] {
  const first = `${month}-01`;
  const next = `${shiftMonth(month, 1)}-01`;
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7; // days since Monday
  const weeks: string[][] = [];
  for (let start = addDays(first, -lead); start < next; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

// What the Done section says for a day DONE.md cannot speak for: the earliest date in the log is where its history
// begins. null when the log covers the day, or the day is still to come.
export function doneNote(day: string, log: DoneLog, today: string): string | null {
  if (day > today) return null;
  const dates = [...log.done.map((e) => e.date), ...log.openCounts.map((c) => c.date)].sort();
  if (dates.length === 0) return "Done history has not started yet.";
  return day < dates[0] ? `Done history starts ${dayLabel(dates[0], today)}.` : null;
}
