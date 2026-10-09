import { checkParity, readMetaCounts } from "./parity.ts";
import { readWorkspace } from "./reader.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const meta = (line: string) =>
  `<header><div class="meta">\n  <div><strong>${line}</strong></div>\n  <div>As of 09:06</div>\n</div></header>`;

test("the old dashboard's counts are read by position, whatever the wording", () => {
  assert.deepEqual(readMetaCounts(meta("55 tasks open · 7 in the inbox · 21 projects · 3 tickets")), {
    tasks: 55,
    inbox: 7,
    projects: 21,
  });
  assert.deepEqual(readMetaCounts(meta("55 offene Aufgaben · 7 im Posteingang · 21 Projekte · 3 Tickets")), {
    tasks: 55,
    inbox: 7,
    projects: 21,
  });
});

test("a dashboard without a meta line cannot be compared, and says so", () => {
  assert.equal(readMetaCounts("<html><body>Nothing here</body></html>"), null);
  assert.equal(readMetaCounts(meta("no numbers at all")), null);
});

test("matching counts are clean; each differing count is named", () => {
  const snapshot = readWorkspace(fixture("full"));
  const { tasks, inbox, projects } = {
    tasks: snapshot.tasks.length,
    inbox: snapshot.inbox.length,
    projects: snapshot.projects.length,
  };

  assert.deepEqual(checkParity(snapshot, meta(`${tasks} tasks open · ${inbox} in the inbox · ${projects} projects`)), {
    state: "match",
  });
  assert.deepEqual(
    checkParity(snapshot, meta(`${tasks + 1} tasks open · ${inbox} in the inbox · ${projects + 1} projects`)),
    {
      state: "mismatch",
      differences: [
        { what: "tasks", app: tasks, old: tasks + 1 },
        { what: "projects", app: projects, old: projects + 1 },
      ],
    },
  );
  assert.deepEqual(checkParity(snapshot, "<html></html>"), { state: "unreadable" });
});
