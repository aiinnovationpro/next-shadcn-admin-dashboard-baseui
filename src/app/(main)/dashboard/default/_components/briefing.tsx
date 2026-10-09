import { Mail } from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDay } from "@/lib/workspace/dates";
import type { Morning } from "@/lib/workspace/reader";

import { CacheHtml } from "./cache-html";

// The last /morning run. A briefing that is not today's sits behind its own "from [day]" label, closed, so it is
// never read as today's. The mail line only exists when mail was checked; the reader already empties it otherwise.
export function Briefing({ morning }: { morning: Morning }) {
  const { date, fromToday, lead, briefing, briefingSections, mailStatus } = morning;
  const day = date ? formatDay(date) : null;

  const body = (
    <>
      {lead && <CacheHtml html={lead} className="font-medium text-base" />}
      {briefing && <CacheHtml html={briefing} />}
      {briefingSections && <CacheHtml html={briefingSections} />}
    </>
  );

  if (!fromToday) {
    return (
      <details className="rounded-md border border-dashed bg-muted/40 p-3 text-sm">
        <summary className="cursor-pointer font-medium">
          Morning briefing from {day ?? "an unknown day"}
          <span className="font-normal text-muted-foreground">. Not today's.</span>
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-muted-foreground">Say good morning in the chat for a fresh one.</p>
          {body}
          {mailStatus && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4 shrink-0" aria-hidden />
              <CacheHtml html={mailStatus} />
            </div>
          )}
        </div>
      </details>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Morning briefing</CardTitle>
        <CardDescription>{day}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">{body}</CardContent>
      {mailStatus && (
        <CardFooter className="gap-2 text-muted-foreground text-sm">
          <Mail className="size-4 shrink-0" aria-hidden />
          <CacheHtml html={mailStatus} />
        </CardFooter>
      )}
    </Card>
  );
}
