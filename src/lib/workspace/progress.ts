import { formatDay } from "./dates.ts";
import type { DoneLog, Project, Task } from "./reader.ts";

// Everything here takes the day as a YYYY-MM-DD string. The server works it out once (todayIso) and passes it down,
// so the server render and the browser can never disagree on the day or the week.

// Overdue, due within 7 days (today included), waiting, due later, no date. A task is counted once, in the first match.
export type Bucket = "overdue" | "soon" | "waiting" | "later" | "none";

// The one order the bar stack and the legend both follow, first to last.
export const BUCKETS = ["overdue", "soon", "waiting", "later", "none"] as const satisfies readonly Bucket[];

export const MAX_WEEKS = 12;

export const todayIso = (now: Date = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

// Date arithmetic on YYYY-MM-DD strings, in UTC so no daylight-saving shift can move a day.
const utc = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
export const addDays = (day: string, n: number) => new Date(utc(day) + n * 86_400_000).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((utc(b) - utc(a)) / 86_400_000);

// The Monday of the calendar week a day falls in.
const weekStart = (day: string) => addDays(day, -((new Date(utc(day)).getUTCDay() + 6) % 7));

export function bucketOf(task: Task, today: string): Bucket {
  if (task.due && task.due < today) return "overdue";
  if (task.due && task.due <= addDays(today, 7)) return "soon";
  if (task.waitingOn) return "waiting";
  return task.due ? "later" : "none";
}

export type Summary = {
  open: number;
  urgent: number; // overdue + due in 7 days
  overdue: number;
  oldestOverdueDays: number | null;
  doneThisWeek: number;
};

// Done entries dated after today cannot have happened yet: they count nowhere.
const doneByToday = (log: DoneLog, today: string) => log.done.filter((e) => e.date <= today);

export function summarize(tasks: Task[], log: DoneLog, today: string): Summary {
  const buckets = tasks.map((t) => bucketOf(t, today));
  const overdue = tasks.filter((_, i) => buckets[i] === "overdue");
  const oldest = overdue.reduce<string | null>((min, t) => (t.due && (!min || t.due < min) ? t.due : min), null);
  const thisWeek = weekStart(today);
  return {
    open: tasks.length,
    urgent: buckets.filter((b) => b === "overdue" || b === "soon").length,
    overdue: overdue.length,
    oldestOverdueDays: oldest ? daysBetween(oldest, today) : null,
    doneThisWeek: doneByToday(log, today).filter((e) => weekStart(e.date) === thisWeek).length,
  };
}

export type WeekPoint = { week: string; done: number; open: number | null }; // week: the Monday, YYYY-MM-DD

// Done entries per calendar week (Monday start), from the first week with a done entry (at most MAX_WEEKS back) to this
// week; weeks with nothing done stay as zero. open is the last count /eod wrote that week, null if it wrote none.
// Empty when nothing has been done yet: the view says so instead of drawing an empty axis.
export function weeklySeries(log: DoneLog, today: string): WeekPoint[] {
  const done = doneByToday(log, today);
  if (done.length === 0) return [];
  const earliest = weekStart(done.reduce((min, e) => (e.date < min ? e.date : min), done[0].date));
  const weeks: WeekPoint[] = [];
  for (let i = MAX_WEEKS - 1; i >= 0; i--) {
    const week = addDays(weekStart(today), -7 * i);
    if (week < earliest) continue;
    const counts = log.openCounts
      .filter((c) => weekStart(c.date) === week)
      .sort((a, b) => a.date.localeCompare(b.date));
    weeks.push({
      week,
      done: done.filter((e) => weekStart(e.date) === week).length,
      open: counts.at(-1)?.open ?? null,
    });
  }
  return weeks;
}

// "Sat Oct 10"; the year only when it is not today's year.
export function dayLabel(iso: string, today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  return formatDay(iso, new Date(y, m - 1, d));
}

// What the empty chart card says. `full` is the whole log, `shown` the log under the current filter: the start date
// always comes from the whole log, and nothing here claims a history starts when entries already exist.
export function doneHistoryNote(full: DoneLog, shown: DoneLog, today: string): string {
  const dates = [...full.done.map((e) => e.date), ...full.openCounts.map((c) => c.date)].sort();
  if (full.done.length === 0) return `Done history starts ${dayLabel(dates[0] ?? today, today)}.`;
  if (shown.done.length === 0)
    return `Nothing done yet under this filter. The log starts ${dayLabel(dates[0], today)}.`;
  const first = shown.done.reduce((min, e) => (e.date < min ? e.date : min), shown.done[0].date);
  return `Every done entry is dated after today (the first is ${dayLabel(first, today)}).`;
}

export type TypeFilter = "all" | "work" | "personal";

// Work and Personal match an explicit **Type:** only; a project with none (or one PROJECTS.md does not list) shows
// under All. /eod's open counts cover every project, so they pass through unfiltered.
export function applyFilter(filter: TypeFilter, projects: Project[], tasks: Task[], log: DoneLog) {
  if (filter === "all") return { projects, tasks, log };
  const names = new Set(projects.filter((p) => p.type === filter).map((p) => p.name));
  return {
    projects: projects.filter((p) => names.has(p.name)),
    tasks: tasks.filter((t) => names.has(t.project)),
    log: { done: log.done.filter((e) => names.has(e.project)), openCounts: log.openCounts },
  };
}

export type ProjectBar = { project: string } & Record<Bucket, number>;

// One bar per project with open tasks, in PROJECTS.md order, then tasks whose project is not listed there, as first
// seen. No sorting by size: the order carries no ranking.
export function projectBars(projects: Project[], tasks: Task[], today: string): ProjectBar[] {
  const names = [...new Set([...projects.map((p) => p.name), ...tasks.map((t) => t.project)])];
  return names
    .map((name) => {
      const bar: ProjectBar = { project: name, overdue: 0, soon: 0, waiting: 0, later: 0, none: 0 };
      for (const t of tasks) if (t.project === name) bar[bucketOf(t, today)]++;
      return bar;
    })
    .filter((b) => b.overdue + b.soon + b.waiting + b.later + b.none > 0);
}
