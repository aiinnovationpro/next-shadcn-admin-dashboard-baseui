import { connection } from "next/server";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { stat } from "node:fs/promises";
import { join } from "node:path";

// The workspace's own START-HERE.html, served read-only by the route next to this page, never copied here.
// No scripts and no origin: the page is only text, pictures and a video.
export async function Walkthrough() {
  await connection();
  const root = process.env.AKUTU_WORKSPACE;
  const found = root
    ? await stat(join(root, "START-HERE.html")).then(
        (s) => s.isFile(),
        () => false,
      )
    : false;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>The walkthrough</CardTitle>
        <CardDescription>
          {found
            ? "The START-HERE.html page from the workspace folder, with the eight-minute video."
            : "START-HERE.html was not found in the workspace folder, so there is no walkthrough to show."}
        </CardDescription>
      </CardHeader>
      {found && (
        <CardContent>
          <iframe
            src="/dashboard/start-here/walkthrough/START-HERE.html"
            title="Start here walkthrough"
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            loading="lazy"
            className="h-[75vh] min-h-[32rem] w-full rounded-lg border"
          />
        </CardContent>
      )}
    </Card>
  );
}
