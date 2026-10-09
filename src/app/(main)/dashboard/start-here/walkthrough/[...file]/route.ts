import { startHereFile } from "@/lib/workspace/start-here-files";

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";

const notFound = (what: string) =>
  new Response(`${what} was not found in the workspace folder.`, {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

// Read-only: GET only, and the file served always comes from the fixed table in start-here-files.ts,
// never from the request. The walkthrough video needs byte ranges, or Safari will not play it.
export async function GET(request: Request, { params }: { params: Promise<{ file: string[] }> }) {
  const root = process.env.AKUTU_WORKSPACE;
  if (!root) return new Response("AKUTU_WORKSPACE is not set", { status: 500 });

  const entry = startHereFile((await params).file);
  if (!entry) return notFound("That file");

  const path = join(root, entry.path);
  const size = await stat(path)
    .then((s) => (s.isFile() ? s.size : undefined))
    .catch(() => undefined);
  if (size === undefined) return notFound(entry.path);

  if (size === 0) return new Response(null, { headers: { "Content-Type": entry.type } });

  const headers: Record<string, string> = {
    "Content-Type": entry.type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  };
  if (entry.sandbox) headers["Content-Security-Policy"] = `sandbox ${entry.sandbox}`;

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  let start = 0;
  let end = size - 1;
  if (range && (range[1] || range[2])) {
    // "bytes=-500" is the last 500 bytes; "bytes=500-" runs to the end
    start = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0);
    end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  headers["Content-Length"] = String(end - start + 1);

  const body = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream;
  return new Response(body, { status: headers["Content-Range"] ? 206 : 200, headers });
}
