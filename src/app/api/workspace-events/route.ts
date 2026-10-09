import { existsSync, watch } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

// Server-sent events: one "changed" message whenever a file in the workspace's context folder changes.
export function GET(request: Request) {
  const root = process.env.AKUTU_WORKSPACE;
  if (!root) return new Response("AKUTU_WORKSPACE is not set", { status: 500 });
  // 204 tells the browser to stop reconnecting; the 60-second refresh still shows the folder coming back
  if (!existsSync(join(root, "context"))) return new Response(null, { status: 204 });

  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      let debounce: ReturnType<typeof setTimeout> | undefined;
      const watcher = watch(join(root, "context"), () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => controller.enqueue(encoder.encode("data: changed\n\n")), 300);
      });
      // the folder can vanish (moved, iCloud); the page shows that on its next read
      watcher.on("error", () => watcher.close());
      const keepAlive = setInterval(() => controller.enqueue(encoder.encode(": keep-alive\n\n")), 25_000);
      cleanup = () => {
        clearTimeout(debounce);
        clearInterval(keepAlive);
        watcher.close();
      };
      request.signal.addEventListener("abort", () => cleanup?.());
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
  });
}
