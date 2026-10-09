import { readWorkspace } from "./reader.ts";
import assert from "node:assert/strict";
import { chmodSync, cpSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

// A scratch copy of a fixture, for tests that change file ages or permissions.
const scratchCopy = (name: string) => {
  const dir = mkdtempSync(join(tmpdir(), "akutu-reader-"));
  cpSync(fixture(name), dir, { recursive: true });
  return dir;
};
const minutesAgo = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60_000);

test("an indented line never attaches to a task it does not belong to", () => {
  const { tasks, notUnderstood } = readWorkspace(fixture("orphan-context"));

  assert.deepEqual(
    tasks.map((t) => [t.headline, t.context]),
    [
      ["Real task", "Real context."],
      ["Task right before a heading", ""],
      ["Other task", ""],
    ],
  );
  assert.deepEqual(
    notUnderstood.map((n) => n.line),
    [
      "- [x] (done 7.10.) Misplaced done item",
      "  Context that belongs to the misplaced item.",
      "  Indented line straight after a heading.",
    ],
  );
});

test("an empty STATUS.md is unreadable, and a STATUS.md with no task section says so", () => {
  const empty = scratchCopy("full");
  writeFileSync(join(empty, "context", "STATUS.md"), "");
  assert.equal(readWorkspace(empty).sources[0].state, "unreadable");

  const sectionless = scratchCopy("full");
  writeFileSync(join(sectionless, "context", "STATUS.md"), "# STATUS\n\nSomething else entirely.\n");
  const snap = readWorkspace(sectionless);
  assert.equal(snap.sources[0].state, "ok");
  assert.deepEqual(snap.notUnderstood, [
    { source: "STATUS.md", section: "Tasks (open)", line: "(section heading not found)" },
  ]);
});

test("the stale marker is recognised with or without its emoji variation selector", () => {
  const dir = scratchCopy("full");
  writeFileSync(
    join(dir, "context", "STATUS.md"),
    "## Tasks (open)\n\n### Alpha\n\n- [ ] ⚠ Bare marker\n- [ ] ⚠️ Emoji marker\n",
  );
  assert.deepEqual(
    readWorkspace(dir).tasks.map((t) => [t.headline, t.stale]),
    [
      ["Bare marker", true],
      ["Emoji marker", true],
    ],
  );
});

test("a file that exists but cannot be read, or was offloaded by iCloud, is never reported as empty", () => {
  const now = new Date(2026, 9, 8, 12);

  const locked = scratchCopy("projects");
  chmodSync(join(locked, "context", "STATUS.md"), 0o000);
  const lockedSnap = readWorkspace(locked, now);
  assert.deepEqual(lockedSnap.sources[0], { name: "STATUS.md", state: "unreadable", ageMinutes: null });
  assert.deepEqual(lockedSnap.tasks, []);
  assert.equal(lockedSnap.sources[1].state, "ok"); // the other files still read

  const offloaded = scratchCopy("projects");
  rmSync(join(offloaded, "context", "STATUS.md"));
  writeFileSync(join(offloaded, "context", ".STATUS.md.icloud"), "");
  assert.equal(readWorkspace(offloaded, now).sources[0].state, "offloaded");
});

test("a workspace folder that does not exist is reported as not found, not as an empty workspace", () => {
  const snap = readWorkspace(join(tmpdir(), "akutu-no-such-folder"));

  assert.equal(snap.workspaceFound, false);
  assert.deepEqual(snap.sources, []);
  assert.deepEqual(snap.tasks, []);
  assert.equal(readWorkspace(fixture("projects")).workspaceFound, true);
});

test("each source reports its state and age; a missing mail cache is reported, not hidden", () => {
  const now = new Date(2026, 9, 8, 12);
  const dir = scratchCopy("projects");
  utimesSync(join(dir, "context", "STATUS.md"), minutesAgo(now, 2), minutesAgo(now, 2));
  utimesSync(join(dir, "context", "PROJECTS.md"), minutesAgo(now, 90), minutesAgo(now, 90));

  assert.deepEqual(readWorkspace(dir, now).sources, [
    { name: "STATUS.md", state: "ok", ageMinutes: 2 },
    { name: "PROJECTS.md", state: "ok", ageMinutes: 90 },
    { name: ".mail_cache.json", state: "missing", ageMinutes: null },
  ]);

  writeFileSync(join(dir, "context", ".mail_cache.json"), "{}");
  const threeDays = minutesAgo(now, 3 * 24 * 60);
  utimesSync(join(dir, "context", ".mail_cache.json"), threeDays, threeDays);
  assert.deepEqual(readWorkspace(dir, now).sources[2], { name: ".mail_cache.json", state: "ok", ageMinutes: 4320 });
});

test("task suffixes become their own fields and leave the headline clean", () => {
  const now = new Date(2026, 9, 8, 12); // Thu Oct 8, 2026
  const { tasks } = readWorkspace(fixture("suffixes"), now);

  assert.deepEqual(
    tasks.map((t) => [t.headline, t.waitingOn, t.category, t.due, t.dueStatus, t.stale]),
    [
      ["Revised agreement promised on the 1.10. call", "Northwind Hub", "comms", "2026-10-08", "today", false],
      ["File and pay the sales tax", null, "admin", "2026-08-30", "overdue", true],
      ["Plan the January intake", null, "prep", "2027-01-05", "upcoming", false],
      ["Book the venue", null, null, null, null, false],
    ],
  );
});

test("a due date without a year lands on the nearest year around today", () => {
  const dueFor = (now: Date) => readWorkspace(fixture("suffixes"), now).tasks[2].due;

  assert.equal(dueFor(new Date(2026, 11, 28, 12)), "2027-01-05"); // late December: January means next year
  assert.equal(dueFor(new Date(2027, 0, 2, 12)), "2027-01-05");
  assert.equal(dueFor(new Date(2027, 0, 20, 12)), "2027-01-05"); // just past: stays this year, overdue
  assert.equal(dueFor(new Date(2026, 0, 3, 12)), "2026-01-05");
});

test("a line the reader cannot place is kept raw in notUnderstood, never dropped", () => {
  const { tasks, notUnderstood } = readWorkspace(fixture("malformed"));

  assert.deepEqual(
    tasks.map((t) => [t.project, t.headline, t.context]),
    [
      ["Alpha Project", "Send the signed agreement", "First context line. Second context line."],
      ["Alpha Project", "Book the venue", ""],
      ["general", "Renew the domain", ""],
    ],
  );
  assert.deepEqual(notUnderstood, [
    { source: "STATUS.md", section: "Tasks (open)", line: "Somebody typed a stray note here, with no bullet." },
    { source: "STATUS.md", section: "Tasks (open)", line: "- [x] (done 7.10.) Joined the classroom" },
  ]);
});

test("inbox items carry source, age, due date and mail link; loose chat notes sit alongside", () => {
  const { inbox, tasks } = readWorkspace(fixture("inbox"), new Date(2026, 9, 8, 12));

  assert.deepEqual(inbox, [
    {
      headline: "Decide whether to take Sam up on the introduction",
      source: "Sam Ortiz",
      age: "for 25d",
      due: null,
      stale: true,
      mailUrl: null,
      context: "",
    },
    {
      headline: "File and pay the sales tax before the deadline",
      source: "taxportal.example",
      age: "for 5d",
      due: "2026-08-30",
      stale: false,
      mailUrl: "https://mail.example.com/thread/abc123",
      context: "Reminder mail dated 25.08. said 5 days left.",
    },
    {
      headline: "Try a weekly review template",
      source: "from the chat",
      age: "since today",
      due: null,
      stale: false,
      mailUrl: null,
      context: "",
    },
  ]);
  assert.equal(tasks.length, 1); // inbox items are not tasks
});

test("current focus, day plan and recently done are read as their own sections", () => {
  const { currentFocus, dayPlan, recentlyDone, tasks } = readWorkspace(fixture("focus-done"));

  assert.equal(
    currentFocus,
    "**Launch:** the first class is today, 16:00-18:30. The revised agreement is still owed.\n\n**Mail:** The accountant wants to know when the books are ready.",
  );
  assert.deepEqual(dayPlan, ["- [ ] Prepare the class slides", "- [ ] Reply to the accountant"]);
  assert.deepEqual(recentlyDone, [
    {
      headline: "Welcome message posted in the team chat",
      category: "comms",
      context: "Screenshot shows it posted; the joining link may be cut off.",
    },
    { headline: "Answered the vendor questions", category: "comms", context: "" },
  ]);
  assert.equal(tasks.length, 1); // done items are not open work
});

test("an empty workspace gives empty sections, not errors; 'no plan set' means no day plan", () => {
  const snap = readWorkspace(fixture("no-plan"));

  assert.equal(snap.currentFocus, "");
  assert.equal(snap.dayPlan, null);
  assert.deepEqual(snap.tasks, []);
  assert.deepEqual(snap.inbox, []);
  assert.deepEqual(snap.recentlyDone, []);
  assert.deepEqual(snap.notUnderstood, []);
});

test("every project block is read with its fields; History is not a project", () => {
  const { projects, notUnderstood } = readWorkspace(fixture("projects"));

  assert.deepEqual(
    projects.map((p) => [p.name, p.phase, p.phaseGroup, p.hasBlocker, p.statusFirstSentence]),
    [
      [
        "Alpha Project",
        "Active (delivering; agreement pending)",
        "Active",
        true,
        "Work has started ahead of the paperwork.",
      ],
      ["Beta Venture", "Planning", "Planning", false, "Created 8.10. Goal still [open]."],
      ["Gamma CRM", "Discovery / Build (both running in parallel)", "Discovery", false, "Discovery call held."],
    ],
  );
  const alpha = projects[0];
  assert.equal(alpha.purpose, "Help the client launch a program.");
  assert.equal(
    alpha.status,
    "Work has started ahead of the paperwork. We sent a counter on 10.09. and the client replied on 12.09. with a question.",
  );
  assert.equal(alpha.stakeholder, "Riley (negotiation contact), Sam (delivery lead)");
  assert.equal(alpha.timeline, "Original term 14.09.26 to 31.07.27.");
  assert.equal(alpha.blocker, "No revised agreement has arrived.");
  assert.equal(alpha.risk, "A regulator issued an order against the client's parent organisation.");
  assert.equal(projects[2].delta, "Phased plan status unclear.");
  assert.equal(projects[1].blocker, null);
  assert.deepEqual(notUnderstood, []);
});

test("project quirks: 'None blocking' is no blocker, bold after a date still ends the first sentence, ';' ends a phase group", () => {
  const [one, two] = readWorkspace(fixture("project-quirks")).projects;

  assert.equal(one.statusFirstSentence, "Discovery call held 28.07. with Dana.");
  assert.equal(one.phaseGroup, "Built");
  assert.equal(one.hasBlocker, false);
  assert.equal(one.blocker, "None blocking. A hosting choice waits on the owner."); // kept: it is still the written text
  assert.equal(two.hasBlocker, true);
  assert.equal(two.phaseGroup, "Build");
});

test("open tasks come out grouped by project, with the context line kept", () => {
  const { tasks } = readWorkspace(fixture("full"));

  assert.deepEqual(
    tasks.map((t) => [t.project, t.headline, t.context]),
    [
      [
        "Alpha Project",
        "Send the signed agreement to the client",
        "The client asked for it twice; the signature page is the only missing part.",
      ],
      ["Alpha Project", "Book the venue", ""],
    ],
  );
});
