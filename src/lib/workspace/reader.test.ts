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
    { name: "JOURNAL.md", state: "missing", ageMinutes: null },
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

const HELPER = join("reference", "scripts", "lib-workspace.js");

test("an inventory the shared helper cannot deliver is unreadable, never an empty inventory", () => {
  const missing = scratchCopy("inventory");
  rmSync(join(missing, HELPER));
  const gone = readWorkspace(missing).inventory;
  assert.equal(gone.state, "unreadable");

  const throwing = scratchCopy("inventory");
  writeFileSync(join(throwing, HELPER), 'throw new Error("helper exploded");\n');
  assert.deepEqual(readWorkspace(throwing).inventory, { state: "unreadable", reason: "helper exploded" });

  const brokenReader = scratchCopy("inventory");
  writeFileSync(
    join(brokenReader, HELPER),
    'module.exports = () => ({ readInventory() { throw new Error("config is garbage"); } });\n',
  );
  assert.deepEqual(readWorkspace(brokenReader).inventory, { state: "unreadable", reason: "config is garbage" });

  const notAFactory = scratchCopy("inventory");
  writeFileSync(join(notAFactory, HELPER), "module.exports = { not: 'a function' };\n");
  assert.equal(readWorkspace(notAFactory).inventory.state, "unreadable");

  assert.equal(readWorkspace(join(tmpdir(), "akutu-no-such-folder")).inventory.state, "unreadable");
});

test("the inventory merges the config with what the machine reports, as the old dashboard does", () => {
  const { inventory } = readWorkspace(fixture("inventory"));
  assert.equal(inventory.state, "ok");
  if (inventory.state !== "ok") return;

  // config entries first, live status wins; servers only the machine knows about follow, undeclared
  assert.deepEqual(inventory.connectors, [
    {
      name: "Acme Mail",
      purpose: "Mail for the studio",
      connected: true,
      declared: true,
      fromPlugin: false,
      scope: null,
    },
    { name: "Acme Chat", purpose: "Team chat", connected: true, declared: true, fromPlugin: false, scope: null },
    { name: "widget-server", purpose: null, connected: true, declared: false, fromPlugin: true, scope: "widgets" },
    { name: "Notes", purpose: null, connected: false, declared: false, fromPlugin: false, scope: "claude.ai" },
  ]);
  assert.equal(inventory.connectorsLive, true);

  // listed or installed, sorted; a listed tool that is not installed stays visible; base tools are flagged
  assert.deepEqual(inventory.tools, [
    { name: "gh", installed: true, purpose: "GitHub from the terminal", base: false },
    { name: "git", installed: true, purpose: null, base: true },
    { name: "node", installed: true, purpose: null, base: true },
    { name: "zzz-tool", installed: false, purpose: "Invented tool", base: false },
  ]);

  // the machine's registry is the truth: a disabled plugin is listed as disabled, not dropped
  assert.deepEqual(inventory.plugins, [
    { name: "gadgets", enabled: false, market: "invented-market", scope: "user", purpose: null },
    { name: "widgets", enabled: true, market: "invented-market", scope: "user", purpose: null },
  ]);

  // config routines first; a machine routine with the same name is not counted twice; the helper ran in the workspace
  assert.deepEqual(inventory.routines, [
    { name: "Morning digest", purpose: "Briefing", schedule: "07:00 weekdays", machine: false },
    { name: "nightly-sync", purpose: "crontab, 0 2 * * *", schedule: null, machine: true },
    { name: "watch-inventory", purpose: "launchd, reagiert auf Datei-Aenderungen", schedule: null, machine: true },
  ]);
});

// A bare-bones helper for tests that need one behaviour changed; `inventory` is the config.yaml content as JSON.
const bareHelper = (inventory: object, overrides = "") => `
module.exports = () => ({
  KNOWN_CLIS: [], BASE_CLIS: [], norm: (x) => String(x), installed: () => false,
  prettyMcp: (n) => ({ short: n, scope: "", fromPlugin: false }),
  plugins: () => [], machineRoutines: () => [], mcpServers: () => [],
  readInventory: () => (${JSON.stringify({ connectors: [], clis: [], plugins: [], routines: [], ...inventory })}),
  ${overrides}
});
`;

test("without a cached server check the app does not ask the machine, and says the connector state is the config's", () => {
  const dir = scratchCopy("inventory");
  rmSync(join(dir, "context", ".mcp_cache.json"));
  writeFileSync(
    join(dir, HELPER),
    bareHelper(
      { connectors: [{ name: "Acme Mail", purpose: "Mail", status: true }] },
      'mcpServers: () => { throw new Error("would run claude mcp list and write into the workspace"); },',
    ),
  );

  const { inventory } = readWorkspace(dir);
  assert.equal(inventory.state, "ok");
  if (inventory.state !== "ok") return;
  assert.equal(inventory.connectorsLive, false);
  assert.deepEqual(inventory.connectors, [
    { name: "Acme Mail", purpose: "Mail", connected: true, declared: true, fromPlugin: false, scope: null },
  ]);
});

test("when the machine reports no plugins, the config's plugins are listed instead", () => {
  const dir = scratchCopy("inventory");
  writeFileSync(
    join(dir, HELPER),
    bareHelper({ plugins: [{ name: "cfg-plugin", status: true, purpose: "From the config" }] }),
  );

  const { inventory } = readWorkspace(dir);
  assert.equal(inventory.state, "ok");
  if (inventory.state !== "ok") return;
  assert.deepEqual(inventory.plugins, [
    { name: "cfg-plugin", enabled: true, market: null, scope: null, purpose: "From the config" },
  ]);
});

test("a workspace without config.yaml has no inventory to show, which is not the same as an empty one", () => {
  const dir = scratchCopy("inventory");
  rmSync(join(dir, "context", "config.yaml"));
  assert.equal(readWorkspace(dir).inventory.state, "unreadable");
});

test("reading the inventory leaves the process where it was, whether the helper works or throws", () => {
  const before = process.cwd();
  readWorkspace(fixture("inventory"));
  assert.equal(process.cwd(), before);

  const dir = scratchCopy("inventory");
  writeFileSync(join(dir, HELPER), 'module.exports = () => { throw new Error("no"); };\n');
  readWorkspace(dir);
  assert.equal(process.cwd(), before);
});

// The morning cache holds escaped HTML fragments written by /morning; they must reach the views unchanged.
const FRESH_BRIEFING =
  "<p>Sam Ortiz sent the <strong>venue</strong> quote &amp; wants a call.</p><p>Nothing is overdue.</p>";

test("the morning cache comes through unchanged, with its date and whether it is today's", () => {
  const now = new Date(2026, 9, 8, 12);
  const { morning } = readWorkspace(fixture("morning-fresh"), now);

  assert.equal(morning.state, "ok");
  assert.equal(morning.date, "2026-10-08");
  assert.equal(morning.fromToday, true);
  assert.equal(morning.mailChecked, true);
  assert.equal(morning.lead, "Two meetings today, the venue call at 2 pm");
  assert.equal(morning.briefing, FRESH_BRIEFING);
  assert.equal(morning.mailStatus, "Tickets open 1 &middot; FYI 2");
  assert.match(morning.agenda, /^<li class="ev" data-time="10:00" data-end="10:30"><b>10:00<\/b> Venue call /);
  assert.match(morning.agenda, /<details class="mb">.*Agree the hall size &amp; price\..*<\/details>/); // meeting briefing kept
  assert.match(morning.briefingSections, /^<details class="brf-sec" open>.*Quote from Sam &lt;3 days&gt;\./);
});

test("a cache from three days ago is flagged as not today's, still carrying its date", () => {
  const { morning } = readWorkspace(fixture("morning-stale"), new Date(2026, 9, 8, 12));
  assert.equal(morning.state, "ok");
  assert.equal(morning.date, "2026-10-05");
  assert.equal(morning.fromToday, false);
  assert.equal(morning.briefing, FRESH_BRIEFING);
});

test("no cache means no morning data; a cache that cannot be parsed is unreadable, never empty", () => {
  const now = new Date(2026, 9, 8, 12);
  const none = readWorkspace(fixture("full"), now);
  assert.equal(none.morning.state, "missing");
  assert.equal(none.morning.briefing, "");
  assert.equal(none.morning.fromToday, false);

  // written by the test: a deliberately broken file would fail every JSON check on the fixtures folder
  const dir = scratchCopy("morning-fresh");
  writeFileSync(join(dir, "context", ".mail_cache.json"), '{ "date": "2026-10-08", "BRIEFING": "<p>cut off');
  const broken = readWorkspace(dir, now);
  assert.equal(broken.morning.state, "unreadable");
  assert.equal(broken.morning.briefing, "");
  assert.equal(broken.sources[2].state, "unreadable");
});

test("a cache written without a mailbox reports mail as not checked and carries no mail status", () => {
  const { morning } = readWorkspace(fixture("morning-unchecked"), new Date(2026, 9, 8, 12));
  assert.equal(morning.mailChecked, false);
  assert.equal(morning.mailStatus, "");
  assert.equal(morning.lead, "");
  assert.match(morning.agenda, /Standup/);
});

test("recent journal entries come out newest first with their bullets; lines it cannot place are not dropped", () => {
  const snap = readWorkspace(fixture("journal"), new Date(2026, 9, 8, 12));

  assert.deepEqual(snap.journal, [
    {
      date: "2026-10-08",
      bullets: [
        "Venue: Sam Ortiz confirmed the hall for 120 guests Deposit due before the end of the month.",
        "Caterer shortlisted, tasting booked",
        "Idea: share the seating plan a week earlier",
      ],
    },
    { date: "2026-10-07", bullets: ["Budget threshold agreed at 250k", "Invoice template updated"] },
    { date: "2026-10-05", bullets: ["Kick-off done"] },
  ]);
  assert.deepEqual(
    snap.notUnderstood
      .filter((n) => n.source === "JOURNAL.md")
      .map((n) => `${n.section} | ${n.line}`)
      .sort(),
    [
      "(entry heading) | ## Archive of old things",
      "(entry heading) | - Orphaned bullet under a heading that is no date",
      "2026-10-07 | Stray prose that is not a bullet.",
    ],
  );
  assert.equal(snap.sources[3].name, "JOURNAL.md");
});

test("only the ten newest journal entries are kept; no journal means no entries", () => {
  const dir = scratchCopy("journal");
  const days = Array.from({ length: 12 }, (_, i) => `## 2026-09-${String(30 - i).padStart(2, "0")}\n- Day ${i}\n`);
  writeFileSync(join(dir, "context", "JOURNAL.md"), `# Journal\n\n---\n\n${days.join("\n")}`);
  const { journal } = readWorkspace(dir);
  assert.equal(journal.length, 10);
  assert.equal(journal[0].date, "2026-09-30");
  assert.equal(journal[9].date, "2026-09-21");

  assert.deepEqual(readWorkspace(fixture("full")).journal, []);
  assert.equal(readWorkspace(fixture("full")).sources[3].state, "missing");
});
