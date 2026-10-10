import type { DoneLog, Project, Task } from "./reader.ts";

// Overdue, due within 7 days (today included), waiting, due later, no date. A task is counted once, in the first match.
export type Bucket = "overdue" | "soon" | "waiting" | "later" | "none";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// Whole calendar days from a to b (YYYY-MM-DD); noon and rounding keep daylight-saving shifts out of it.
const daysBetween = (a: string, b: string) => {
  const noon = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 12).getTime();
  };
  return Math.round((noon(b) - noon(a)) / 86_400_000);
};

// The Monday (YYYY-MM-DD) of the calendar week a date falls in.
const weekStart = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  return iso(addDays(day, -((day.getDay() + 6) % 7)));
};

export function bucketOf(task: Task, now: Date): Bucket {
  const today = iso(now);
  if (task.due && task.due < today) return "overdue";
  if (task.due && task.due <= iso(addDays(now, 7))) return "soon";
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

export function summarize(tasks: Task[], log: DoneLog, now: Date): Summary {
  const buckets = tasks.map((t) => bucketOf(t, now));
  const overdue = tasks.filter((_, i) => buckets[i] === "overdue");
  const oldest = overdue.reduce<string | null>((min, t) => (t.due && (!min || t.due < min) ? t.due : min), null);
  const thisWeek = weekStart(iso(now));
  return {
    open: tasks.length,
    urgent: buckets.filter((b) => b === "overdue" || b === "soon").length,
    overdue: overdue.length,
    oldestOverdueDays: oldest ? daysBetween(oldest, iso(now)) : null,
    doneThisWeek: log.done.filter((e) => weekStart(e.date) === thisWeek).length,
  };
}

export type WeekPoint = { week: string; done: number; open: number | null }; // week: the Monday, YYYY-MM-DD

const MAX_WEEKS = 12;

// Done entries per calendar week (Monday start), from the first week with a done entry (at most 12 weeks back) to this
// week; weeks with nothing done stay as zero. open is the last count /eod wrote that week, null if it wrote none.
// Empty when nothing has been done: the view says so instead of drawing an empty axis.
export function weeklySeries(log: DoneLog, now: Date): WeekPoint[] {
  if (log.done.length === 0) return [];
  const thisWeek = weekStart(iso(now));
  const [y, m, d] = thisWeek.split("-").map(Number);
  const earliest = weekStart(log.done.reduce((min, e) => (e.date < min ? e.date : min), log.done[0].date));
  const weeks: WeekPoint[] = [];
  for (let i = MAX_WEEKS - 1; i >= 0; i--) {
    const week = iso(new Date(y, m - 1, d - 7 * i));
    if (week < earliest) continue;
    const counts = log.openCounts
      .filter((c) => weekStart(c.date) === week)
      .sort((a, b) => a.date.localeCompare(b.date));
    weeks.push({
      week,
      done: log.done.filter((e) => weekStart(e.date) === week).length,
      open: counts.length > 0 ? counts[counts.length - 1].open : null,
    });
  }
  return weeks;
}

// The earliest date in DONE.md, or today when it has no entries.
export function historyStart(log: DoneLog, now: Date): string {
  const dates = [...log.done.map((e) => e.date), ...log.openCounts.map((c) => c.date)].sort();
  return dates[0] ?? iso(now);
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

export type Bar = { project: string } & Record<Bucket, number>;

// One bar per project with open tasks, in PROJECTS.md order, then tasks whose project is not listed there, as first
// seen. No sorting by size: the order carries no ranking.
export function projectBars(projects: Project[], tasks: Task[], now: Date): Bar[] {
  const names = [...new Set([...projects.map((p) => p.name), ...tasks.map((t) => t.project)])];
  return names
    .map((name) => {
      const bar: Bar = { project: name, overdue: 0, soon: 0, waiting: 0, later: 0, none: 0 };
      for (const t of tasks) if (t.project === name) bar[bucketOf(t, now)]++;
      return bar;
    })
    .filter((b) => b.overdue + b.soon + b.waiting + b.later + b.none > 0);
}
