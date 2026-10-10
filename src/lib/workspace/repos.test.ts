import { readProjectRepos } from "./repos.ts";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

// A workspace in a temp dir: config.yaml needs absolute paths, so it cannot be a static fixture.
function workspace() {
  const root = mkdtempSync(join(tmpdir(), "akutu-repos-"));
  const repo = (rel: string) => {
    const dir = join(root, "repos", rel);
    mkdirSync(dir, { recursive: true });
    return dir;
  };
  const readme = (slug: string, title: string) => {
    mkdirSync(join(root, "projects", slug), { recursive: true });
    writeFileSync(join(root, "projects", slug, "README.md"), `# Project: ${title}\n\n**Status:** Active\n`);
  };
  mkdirSync(join(root, "context"));
  return { root, repo, readme };
}

test("a project heading maps to the repos its bridge sources live in", () => {
  const { root, repo, readme } = workspace();
  const company = repo("Acme Co");
  const app = repo("Acme Co/acme-app");
  const site = repo("Riverside Society");
  mkdirSync(join(site, ".claude"));
  readme("acme-trading", "Acme Trading");
  readme("riverside", "Riverside Society Website");
  readme("ledger", "Ledger Setup");
  writeFileSync(
    join(root, "context", "config.yaml"),
    [
      "project_status_bridge:",
      '  name: "Project Status Bridge"',
      "  sources:",
      '    - project: "acme-trading"',
      `      status_file: "${company}/AGENT-STATUS.md"`,
      '      owner: "Owner"',
      '    - project: "acme-trading"',
      `      status_file: "${app}/AGENT-STATUS.md"`,
      '    - project: "acme-trading"',
      `      status_file: "${company}/AGENT-STATUS.md"`,
      '    - project: "acme-trading"',
      `      status_file: "${join(root, "repos", "gone")}/AGENT-STATUS.md"`,
      '    - project: "riverside"',
      `      status_file: "${site}/.claude/AGENT-STATUS.md"`,
      '    - project: "no-readme"',
      `      status_file: "${company}/AGENT-STATUS.md"`,
      "",
    ].join("\n"),
  );

  const repos = readProjectRepos(root);

  assert.deepEqual(repos["Acme Trading"], [
    { name: "Acme Co", path: company },
    { name: "acme-app", path: app },
  ]);
  assert.deepEqual(repos["Riverside Society Website"], [{ name: "Riverside Society", path: site }]);
  assert.equal(repos["Ledger Setup"], undefined); // no bridge source: the view falls back to Akutu_2
  assert.equal(Object.keys(repos).length, 2);
});

test("no config.yaml and no projects folder give an empty map, not an error", () => {
  const { root } = workspace();
  assert.deepEqual(readProjectRepos(root), {});
});
