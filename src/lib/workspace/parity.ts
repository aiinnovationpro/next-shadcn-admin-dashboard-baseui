import type { Snapshot } from "./reader.ts";

type Counts = { tasks: number; inbox: number; projects: number };

export type Parity =
  | { state: "match" }
  | { state: "mismatch"; differences: { what: keyof Counts; app: number; old: number }[] }
  | { state: "unreadable" }; // the old dashboard has no meta line we can read

// The meta line's wording follows the working language, but the order of its numbers is fixed:
// tasks open, inbox items, projects (then tickets, which the app does not show). Read by position.
export function readMetaCounts(html: string): Counts | null {
  const line = /<div class="meta">\s*<div><strong>([^<]*)<\/strong>/.exec(html)?.[1];
  const numbers = line?.match(/\d+/g);
  if (!numbers || numbers.length < 3) return null;
  const [tasks, inbox, projects] = numbers.map(Number);
  return { tasks, inbox, projects };
}

export function checkParity(snapshot: Snapshot, oldDashboardHtml: string): Parity {
  const old = readMetaCounts(oldDashboardHtml);
  if (!old) return { state: "unreadable" };
  const app: Counts = {
    tasks: snapshot.tasks.length,
    inbox: snapshot.inbox.length,
    projects: snapshot.projects.length,
  };
  const differences = (Object.keys(app) as (keyof Counts)[])
    .filter((what) => app[what] !== old[what])
    .map((what) => ({ what, app: app[what], old: old[what] }));
  return differences.length ? { state: "mismatch", differences } : { state: "match" };
}
