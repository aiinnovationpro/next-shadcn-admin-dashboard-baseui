import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export type Repo = { name: string; path: string };

// Which local repos a STATUS.md project heading works in, for the "Open in VS Code" button.
// Heading -> slug from each projects/<slug>/README.md title ("# Project: <Heading>"); slug -> repos from
// config.yaml project_status_bridge.sources (a repo is the folder holding its AGENT-STATUS.md, or the parent
// of a .claude folder holding it). Only folders that exist are kept. A heading with no repo is left out:
// the view falls back to the workspace itself. Paths only ever come from these files, never from the browser.
export function readProjectRepos(root: string): Record<string, Repo[]> {
  const bySlug = bridgeRepos(root);
  const out: Record<string, Repo[]> = {};
  for (const [slug, heading] of projectHeadings(root)) {
    const repos = bySlug.get(slug);
    if (repos?.length) out[heading] = repos;
  }
  return out;
}

function projectHeadings(root: string): Map<string, string> {
  const dir = join(root, "projects");
  const headings = new Map<string, string>();
  if (!existsSync(dir)) return headings;
  for (const slug of readdirSync(dir)) {
    if (slug.startsWith("_") || slug.startsWith(".")) continue; // _template, _archive
    const readme = join(dir, slug, "README.md");
    if (!existsSync(readme)) continue;
    const title = readFileSync(readme, "utf8")
      .match(/^# Project: (.+)$/m)?.[1]
      ?.trim();
    if (title) headings.set(slug, title);
  }
  return headings;
}

// A line reader for the one list it needs; config.yaml has no parser dependency here (lib-workspace.js does the same).
function bridgeRepos(root: string): Map<string, Repo[]> {
  const file = join(root, "context", "config.yaml");
  const repos = new Map<string, Repo[]>();
  if (!existsSync(file)) return repos;
  const unquote = (v: string) => v.trim().replace(/^["']|["']$/g, "");
  let inBridge = false;
  let slug: string | null = null;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (/^\S/.test(line)) inBridge = line.startsWith("project_status_bridge:");
    if (!inBridge) continue;
    const project = line.match(/^\s*- project:\s*(.+)$/);
    if (project) {
      slug = unquote(project[1]);
      continue;
    }
    const status = line.match(/^\s*status_file:\s*(.+)$/);
    if (!status || !slug) continue;
    let dir = dirname(unquote(status[1]));
    if (basename(dir) === ".claude") dir = dirname(dir);
    const list = repos.get(slug) ?? [];
    if (existsSync(dir) && !list.some((r) => r.path === dir)) list.push({ name: basename(dir), path: dir });
    repos.set(slug, list);
  }
  return repos;
}
