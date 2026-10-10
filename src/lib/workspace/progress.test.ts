import {
  applyFilter,
  BUCKETS,
  bucketOf,
  dayLabel,
  doneHistoryNote,
  projectBars,
  summarize,
  todayIso,
  weeklySeries,
} from "./progress.ts";
import type { DoneLog, Project, Task } from "./reader.ts";
import assert from "node:assert/strict";
import { test } from "node:test";

// Saturday 10 Oct 2026. The calendar week runs Mon 5 Oct to Sun 11 Oct. Every function takes the day as a
// YYYY-MM-DD string, computed once on the server, so no time zone can move it.
const today = "2026-10-10";

const task = (over: Partial<Task> = {}): Task => ({
  project: "Alpha",
  headline: "A task",
  context: "",
  waitingOn: null,
  category: null,
  due: null,
  dueStatus: null,
  stale: false,
  ...over,
});
const noLog: DoneLog = { done: [], openCounts: [] };

test("dayLabel leaves the year out only for today's year", () => {
  assert.equal(dayLabel("2026-10-02", today), "Fri Oct 2");
  assert.equal(dayLabel("2025-12-30", today), "Tue Dec 30, 2025");
});

test("todayIso writes a local date as YYYY-MM-DD", () => {
  assert.equal(todayIso(new Date(2026, 9, 10, 23, 59)), "2026-10-10");
  assert.equal(todayIso(new Date(2026, 0, 5, 0, 0)), "2026-01-05");
});

test("a task lands in the first bucket that matches: overdue, due in 7 days, waiting, later, no date", () => {
  assert.equal(bucketOf(task({ due: "2026-10-09" }), today), "overdue");
  assert.equal(bucketOf(task({ due: "2026-10-09", waitingOn: "Sam" }), today), "overdue");
  assert.equal(bucketOf(task({ due: "2026-10-10" }), today), "soon");
  assert.equal(bucketOf(task({ due: "2026-10-17" }), today), "soon");
  assert.equal(bucketOf(task({ due: "2026-10-17", waitingOn: "Sam" }), today), "soon");
  assert.equal(bucketOf(task({ due: "2026-10-18" }), today), "later");
  assert.equal(bucketOf(task({ due: "2026-10-18", waitingOn: "Sam" }), today), "waiting");
  assert.equal(bucketOf(task({ waitingOn: "Sam" }), today), "waiting");
  assert.equal(bucketOf(task(), today), "none");
  assert.equal(bucketOf(task({ due: "2026-11-02" }), "2026-10-27"), "soon"); // across a month end
});

test("the cards count open, urgent, behind (with the oldest overdue in days) and done this calendar week", () => {
  const tasks = [
    task({ due: "2026-10-04" }), // overdue, 6 days
    task({ due: "2026-08-07" }), // overdue, 64 days
    task({ due: "2026-10-12" }), // soon
    task({ due: "2026-11-30" }),
    task({ waitingOn: "Sam" }),
    task(),
  ];
  const log: DoneLog = {
    done: [
      { date: "2026-10-04", project: "Alpha", headline: "Sunday, last week", category: null },
      { date: "2026-10-05", project: "Alpha", headline: "Monday", category: null },
      { date: "2026-10-10", project: "Beta", headline: "Today", category: "admin" },
      { date: "2026-10-11", project: "Beta", headline: "Dated tomorrow, so not done yet", category: null },
    ],
    openCounts: [],
  };
  assert.deepEqual(summarize(tasks, log, today), {
    open: 6,
    urgent: 3,
    overdue: 2,
    oldestOverdueDays: 64,
    doneThisWeek: 2,
  });
});

test("with nothing open and nothing done every number is zero and there is no oldest overdue", () => {
  assert.deepEqual(summarize([], noLog, today), {
    open: 0,
    urgent: 0,
    overdue: 0,
    oldestOverdueDays: null,
    doneThisWeek: 0,
  });
});

const project = (name: string, type: Project["type"]): Project => ({
  name,
  purpose: "",
  status: "",
  statusFirstSentence: "",
  phase: "",
  phaseGroup: "",
  stakeholder: "",
  timeline: "",
  start: null,
  finish: null,
  blocker: null,
  hasBlocker: false,
  type,
  risk: null,
  delta: null,
});
const projects = [project("Alpha", "work"), project("Beta", "personal"), project("Gamma", null)];
const entry = (p: string) => ({ date: "2026-10-05", project: p, headline: "x", category: null });

test("the type filter keeps explicit matches only; untyped projects show under All and nowhere else", () => {
  const tasks = [
    task({ project: "Alpha" }),
    task({ project: "Beta" }),
    task({ project: "Gamma" }),
    task({ project: "Ghost" }),
  ];
  const log: DoneLog = {
    done: [entry("Alpha"), entry("Beta"), entry("Gamma")],
    openCounts: [{ date: "2026-10-09", open: 4 }],
  };

  const all = applyFilter("all", projects, tasks, log);
  assert.equal(all.tasks.length, 4);
  assert.equal(all.projects.length, 3);
  assert.equal(all.log.done.length, 3);

  const personal = applyFilter("personal", projects, tasks, log);
  assert.deepEqual(
    personal.projects.map((p) => p.name),
    ["Beta"],
  );
  assert.deepEqual(
    personal.tasks.map((t) => t.project),
    ["Beta"],
  );
  assert.deepEqual(
    personal.log.done.map((e) => e.project),
    ["Beta"],
  );
  assert.deepEqual(personal.log.openCounts, log.openCounts); // /eod counts every project: it cannot be split by type

  assert.deepEqual(
    applyFilter("work", projects, tasks, log).tasks.map((t) => t.project),
    ["Alpha"],
  );
  assert.deepEqual(applyFilter("personal", [project("A", "work")], [task({ project: "A" })], log).projects, []);
});

test("the stacked bars follow PROJECTS.md order, then tasks whose project is not in it, and skip projects with no open tasks", () => {
  const tasks = [
    task({ project: "Ghost", due: "2026-10-01" }),
    task({ project: "Beta" }),
    task({ project: "Alpha", due: "2026-10-01" }),
    task({ project: "Alpha", due: "2026-10-11" }),
    task({ project: "Alpha", waitingOn: "Sam" }),
    task({ project: "Alpha", due: "2026-12-01" }),
  ];
  assert.deepEqual(projectBars(projects, tasks, today), [
    { project: "Alpha", overdue: 1, soon: 1, waiting: 1, later: 1, none: 0 },
    { project: "Beta", overdue: 0, soon: 0, waiting: 0, later: 0, none: 1 },
    { project: "Ghost", overdue: 1, soon: 0, waiting: 0, later: 0, none: 0 },
  ]);
  assert.deepEqual(projectBars([], [], today), []);
});

const e = (date: string) => ({ date, project: "Alpha", headline: "x", category: null });

test("done per week runs from the first week with a log entry to this week, with zero-weeks kept and the last open count of each week", () => {
  const log: DoneLog = {
    done: [e("2026-09-22"), e("2026-09-23"), e("2026-10-07"), e("2026-10-10")],
    openCounts: [
      { date: "2026-09-25", open: 58 },
      { date: "2026-09-26", open: 57 },
      { date: "2026-10-09", open: 52 },
    ],
  };
  assert.deepEqual(weeklySeries(log, today), [
    { week: "2026-09-21", done: 2, open: 57 },
    { week: "2026-09-28", done: 0, open: null },
    { week: "2026-10-05", done: 2, open: 52 },
  ]);
});

test("the weekly series is capped at 12 weeks and is empty when nothing was done", () => {
  assert.equal(weeklySeries({ done: [e("2025-01-06")], openCounts: [] }, today).length, 12);
  assert.deepEqual(weeklySeries({ done: [], openCounts: [{ date: "2026-10-09", open: 5 }] }, today), []);
});

test("entries dated after today are left out of the weekly series, even when they are all there is", () => {
  const log: DoneLog = { done: [e("2026-10-08"), e("2026-10-11"), e("2026-10-20")], openCounts: [] };
  assert.deepEqual(weeklySeries(log, today), [{ week: "2026-10-05", done: 1, open: null }]);
  assert.deepEqual(weeklySeries({ done: [e("2026-10-20")], openCounts: [] }, today), []);
});

test("the note under an empty chart says only what is true: where the log starts, or why this filter shows nothing", () => {
  const full: DoneLog = { done: [e("2026-10-08")], openCounts: [{ date: "2026-10-02", open: 9 }] };
  // No done entries at all: the history starts at the earliest date in DONE.md, else today.
  assert.equal(doneHistoryNote(noLog, noLog, today), "Done history starts Sat Oct 10.");
  assert.equal(
    doneHistoryNote({ done: [], openCounts: [{ date: "2026-10-02", open: 9 }] }, noLog, today),
    "Done history starts Fri Oct 2.",
  );
  // A filter with no entries: the start comes from the whole log, never from today.
  assert.equal(
    doneHistoryNote(full, { done: [], openCounts: full.openCounts }, today),
    "Nothing done yet under this filter. The log starts Fri Oct 2.",
  );
  // Only future-dated entries: not a history that "starts".
  const future: DoneLog = { done: [e("2026-10-20")], openCounts: [] };
  assert.equal(
    doneHistoryNote(future, future, today),
    "Every done entry is dated after today (the first is Tue Oct 20).",
  );
});

test("BUCKETS is the one stack and legend order, and names every count a bar carries", () => {
  assert.deepEqual([...BUCKETS], ["overdue", "soon", "waiting", "later", "none"]);
  const [bar] = projectBars([], [task()], today);
  assert.deepEqual(
    Object.keys(bar)
      .filter((k) => k !== "project")
      .sort(),
    [...BUCKETS].sort(),
  );
});
