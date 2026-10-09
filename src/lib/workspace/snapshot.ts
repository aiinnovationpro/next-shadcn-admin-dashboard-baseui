import { connection } from "next/server";

import { readWorkspace, type Snapshot } from "./reader";

// Every request builds the snapshot fresh from the files; there is no cache to go stale.
export async function getSnapshot(): Promise<Snapshot> {
  await connection();
  const root = process.env.AKUTU_WORKSPACE;
  if (!root) throw new Error("AKUTU_WORKSPACE is not set. Point it at the Akutu_2 folder in .env.local.");
  return readWorkspace(root);
}
