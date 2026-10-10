import { connection } from "next/server";

import { readWorkspace, type Snapshot } from "./reader";
import { type Repo, readProjectRepos } from "./repos";

function workspaceRoot(): string {
  const root = process.env.AKUTU_WORKSPACE;
  if (!root) throw new Error("AKUTU_WORKSPACE is not set. Point it at the Akutu_2 folder in .env.local.");
  return root;
}

// Every request builds the snapshot fresh from the files; there is no cache to go stale.
export async function getSnapshot(): Promise<Snapshot> {
  await connection();
  return readWorkspace(workspaceRoot());
}

// The repos each project works in, plus the workspace itself for projects that have none.
export async function getProjectRepos(): Promise<{ repos: Record<string, Repo[]>; fallback: Repo }> {
  await connection();
  const root = workspaceRoot();
  return { repos: readProjectRepos(root), fallback: { name: "Akutu_2", path: root } };
}
