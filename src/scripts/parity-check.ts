// Compares the app's counts with the old dashboard's meta line. One line out, so /morning or /checkup can pass it on.
// Run from the repo root: node --no-warnings --env-file=.env.local src/scripts/parity-check.ts
// Exit 0 = counts match, 1 = mismatch, 2 = could not compare.

import { checkParity } from "../lib/workspace/parity.ts";
import { readWorkspace } from "../lib/workspace/reader.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.env.AKUTU_WORKSPACE;
if (!root) {
  console.log("Parity: cannot compare, AKUTU_WORKSPACE is not set.");
  process.exit(2);
}

let oldHtml: string;
try {
  oldHtml = readFileSync(join(root, "context", "today.html"), "utf8");
} catch {
  console.log("Parity: cannot compare, the old dashboard (context/today.html) cannot be read.");
  process.exit(2);
}

const snapshot = readWorkspace(root);
if (!snapshot.workspaceFound) {
  console.log("Parity: cannot compare, the workspace folder was not found.");
  process.exit(2);
}

const result = checkParity(snapshot, oldHtml);
if (result.state === "match") {
  console.log("Parity: OK, the app and the old dashboard show the same counts.");
} else if (result.state === "unreadable") {
  console.log("Parity: cannot compare, the old dashboard has no readable counts line.");
  process.exit(2);
} else {
  const parts = result.differences.map((d) => `${d.what} app ${d.app} vs old ${d.old}`);
  console.log(`Parity: MISMATCH, ${parts.join("; ")}.`);
  process.exit(1);
}
