import { dayItems, doneNote, indexDays, monthOf, monthWeeks, shiftMonth } from "./calendar.ts";
import type { DoneLog, JournalEntry, Project, Task } from "./reader.ts";
import assert from "node:assert/strict";
import { test } from "node:test";

// Saturday 10 Oct 2026. Every function takes the day as a YYYY-MM-DD string computed once on the server.
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
const project = (over: Partial<Project> = {}): Project => ({
  name: "Alpha",
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
  type: null,
  risk: null,
  delta: null,
  ...over,
});
const noLog: DoneLog = { done: [], openCounts: [] };
const none = { tasks: [], doneLog: noLog, journal: [], projects: [] };

test("a day with nothing on it comes back empty, in a workspace with no entries at all", () => {
  const index = indexDays(none, today);
  assert.deepEqual(dayItems(index, "2026-10-14"), { due: [], done: [], journal: [], starts: [], finishes: [] });
});

test("one day can carry every kind: tasks due, done entries, journal bullets, a project start and a finish", () => {
  const journal: JournalEntry[] = [{ date: "2026-10-09", bullets: ["Met the caterer", "Booked the hall"] }];
  const index = indexDays(
    {
      tasks: [task({ headline: "Send invoice", due: "2026-10-09" }), task({ headline: "Later", due: "2026-10-20" })],
      doneLog: {
        done: [{ date: "2026-10-09", project: "Alpha", headline: "Drafted plan", category: "prep" }],
        openCounts: [{ date: "2026-10-09", open: 30 }],
      },
      journal,
      projects: [
        project({ name: "Alpha", start: "2026-10-09" }),
        project({ name: "Beta", finish: "2026-10-09" }),
        project({ name: "Gamma" }),
      ],
    },
    today,
  );
  const day = dayItems(index, "2026-10-09");

  assert.deepEqual(
    day.due.map((t) => t.headline),
    ["Send invoice"],
  );
  assert.deepEqual(
    day.done.map((d) => d.headline),
    ["Drafted plan"],
  );
  assert.deepEqual(day.journal, ["Met the caterer", "Booked the hall"]);
  assert.deepEqual(day.starts, ["Alpha"]);
  assert.deepEqual(day.finishes, ["Beta"]);
});

test("a task whose due date is in another month sits on that day, not on the month being looked at", () => {
  const index = indexDays({ ...none, tasks: [task({ headline: "Renew licence", due: "2026-11-02" })] }, today);

  assert.equal(dayItems(index, "2026-11-02").due.length, 1);
  assert.equal(dayItems(index, "2026-10-02").due.length, 0);
});

test("two journal entries for the same date merge, and a task with no due date is on no day", () => {
  const index = indexDays(
    {
      ...none,
      tasks: [task({ due: null })],
      journal: [
        { date: "2026-03-01", bullets: ["First"] },
        { date: "2026-03-01", bullets: ["Second"] },
      ],
    },
    today,
  );

  assert.deepEqual(dayItems(index, "2026-03-01").journal, ["First", "Second"]);
  assert.deepEqual(Object.keys(index), ["2026-03-01"]);
});

test("done entries dated after today are left out, as on the Progress page", () => {
  const index = indexDays(
    {
      ...none,
      doneLog: { done: [{ date: "2026-10-12", project: "Alpha", headline: "Odd", category: null }], openCounts: [] },
    },
    today,
  );

  assert.deepEqual(dayItems(index, "2026-10-12").done, []);
});

test("monthWeeks: weeks start on Monday and are whole, with the neighbouring months' days filling the ends", () => {
  const weeks = monthWeeks("2026-10");

  assert.equal(weeks.length, 5);
  assert.ok(weeks.every((w) => w.length === 7));
  assert.deepEqual(weeks[0], [
    "2026-09-28",
    "2026-09-29",
    "2026-09-30",
    "2026-10-01",
    "2026-10-02",
    "2026-10-03",
    "2026-10-04",
  ]);
  assert.equal(weeks[4][6], "2026-11-01"); // October 2026 ends on a Saturday; the last week closes on Sunday 1 Nov
});

test("monthWeeks: a month that starts on a Monday has no leading days, and one that fits four weeks has four", () => {
  const feb = monthWeeks("2027-02"); // Mon 1 Feb 2027 to Sun 28 Feb 2027
  assert.equal(feb.length, 4);
  assert.equal(feb[0][0], "2027-02-01");
  assert.equal(feb[3][6], "2027-02-28");
});

test("monthWeeks: a month can need six weeks, and a year boundary rolls over cleanly", () => {
  const aug = monthWeeks("2026-08"); // Sat 1 Aug to Mon 31 Aug
  assert.equal(aug.length, 6);
  assert.equal(aug[0][0], "2026-07-27");
  assert.equal(aug[5][0], "2026-08-31");

  const dec = monthWeeks("2026-12");
  assert.equal(dec.at(-1)?.[6], "2027-01-03");
});

test("shiftMonth moves by whole months across a year end, and monthOf reads it off a day", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-10", 0), "2026-10");
  assert.equal(monthOf("2026-10-31"), "2026-10");
});

test("doneNote: a day before the first entry of DONE.md says when the history starts, other days say nothing", () => {
  const log: DoneLog = {
    done: [{ date: "2026-10-10", project: "Alpha", headline: "Thing", category: null }],
    openCounts: [{ date: "2026-10-10", open: 5 }],
  };

  assert.equal(doneNote("2026-10-09", log, today), "Done history starts Sat Oct 10.");
  assert.equal(doneNote("2025-12-30", log, today), "Done history starts Sat Oct 10.");
  assert.equal(doneNote("2026-10-10", log, today), null);
  assert.equal(doneNote("2026-10-11", log, today), null); // the future: nothing to report either way
});

test("doneNote: the first date can come from an open count alone, and a missing or empty DONE.md has not started", () => {
  const countsOnly: DoneLog = { done: [], openCounts: [{ date: "2026-10-08", open: 5 }] };

  assert.equal(doneNote("2026-10-07", countsOnly, today), "Done history starts Thu Oct 8.");
  assert.equal(doneNote("2026-10-08", countsOnly, today), null);
  assert.equal(doneNote("2026-10-09", noLog, today), "Done history has not started yet.");
  assert.equal(doneNote("2026-10-20", noLog, today), null);
});
