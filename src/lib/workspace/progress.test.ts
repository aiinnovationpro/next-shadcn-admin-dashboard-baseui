import { applyFilter, bucketOf, historyStart, projectBars, summarize, weeklySeries } from "./progress.ts";
import type { DoneLog, Project, Task } from "./reader.ts";
import assert from "node:assert/strict";
import { test } from "node:test";

// Saturday 10 Oct 2026, local time. The calendar week runs Mon 5 Oct to Sun 11 Oct.
const now = new Date(2026, 9, 10, 15, 0);

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

test("a task lands in the first bucket that matches: overdue, due in 7 days, waiting, later, no date", () => {
  assert.equal(bucketOf(task({ due: "2026-10-09" }), now), "overdue");
  assert.equal(bucketOf(task({ due: "2026-10-09", waitingOn: "Sam" }), now), "overdue");
  assert.equal(bucketOf(task({ due: "2026-10-10" }), now), "soon");
  assert.equal(bucketOf(task({ due: "2026-10-17" }), now), "soon");
  assert.equal(bucketOf(task({ due: "2026-10-17", waitingOn: "Sam" }), now), "soon");
  assert.equal(bucketOf(task({ due: "2026-10-18" }), now), "later");
  assert.equal(bucketOf(task({ due: "2026-10-18", waitingOn: "Sam" }), now), "waiting");
  assert.equal(bucketOf(task({ waitingOn: "Sam" }), now), "waiting");
  assert.equal(bucketOf(task(), now), "none");
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
    ],
    openCounts: [],
  };
  assert.deepEqual(summarize(tasks, log, now), {
    open: 6,
    urgent: 3,
    overdue: 2,
    oldestOverdueDays: 64,
    doneThisWeek: 2,
  });
});

test("with nothing open and nothing done every number is zero and there is no oldest overdue", () => {
  assert.deepEqual(summarize([], noLog, now), {
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
  assert.deepEqual(projectBars(projects, tasks, now), [
    { project: "Alpha", overdue: 1, soon: 1, waiting: 1, later: 1, none: 0 },
    { project: "Beta", overdue: 0, soon: 0, waiting: 0, later: 0, none: 1 },
    { project: "Ghost", overdue: 1, soon: 0, waiting: 0, later: 0, none: 0 },
  ]);
  assert.deepEqual(projectBars([], [], now), []);
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
  assert.deepEqual(weeklySeries(log, now), [
    { week: "2026-09-21", done: 2, open: 57 },
    { week: "2026-09-28", done: 0, open: null },
    { week: "2026-10-05", done: 2, open: 52 },
  ]);
});

test("the weekly series is capped at 12 weeks and is empty when nothing was done", () => {
  assert.equal(weeklySeries({ done: [e("2025-01-06")], openCounts: [] }, now).length, 12);
  assert.deepEqual(weeklySeries({ done: [], openCounts: [{ date: "2026-10-09", open: 5 }] }, now), []);
});

test("done history starts on the earliest date in DONE.md, else today", () => {
  const log: DoneLog = { done: [e("2026-10-08")], openCounts: [{ date: "2026-10-02", open: 9 }] };
  assert.equal(historyStart(log, now), "2026-10-02");
  assert.equal(historyStart(noLog, now), "2026-10-10");
});
