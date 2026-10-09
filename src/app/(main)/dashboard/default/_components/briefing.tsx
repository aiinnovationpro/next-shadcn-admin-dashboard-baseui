import { Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDay } from "@/lib/workspace/dates";
import type { Morning } from "@/lib/workspace/reader";

import { CacheHtml } from "./cache-html";

// The last /morning run. An old briefing is set apart (dashed, muted, labelled) so it is never read as today's.
// The mail line only exists when mail was checked; the reader already empties it otherwise.
export function Briefing({ morning }: { morning: Morning }) {
  const { date, fromToday, lead, briefing, briefingSections, mailStatus } = morning;
  const day = date ? formatDay(date) : null;

  return (
    <Card size="sm" className={fromToday ? undefined : "border border-foreground/30 border-dashed bg-muted/40 ring-0"}>
      <CardHeader>
        <CardTitle>Morning briefing</CardTitle>
        <CardDescription>{day ?? "No date in the saved briefing"}</CardDescription>
        {!fromToday && (
          <CardAction>
            <Badge variant="secondary">{day ? `From ${day}` : "Undated"}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {!fromToday && (
          <p className="text-muted-foreground">Not today's briefing. Say good morning in the chat for a fresh one.</p>
        )}
        {lead && <CacheHtml html={lead} className="font-medium text-base" />}
        {briefing && <CacheHtml html={briefing} />}
        {briefingSections && <CacheHtml html={briefingSections} />}
      </CardContent>
      {mailStatus && (
        <CardFooter className="gap-2 text-muted-foreground text-sm">
          <Mail className="size-4 shrink-0" aria-hidden />
          <CacheHtml html={mailStatus} />
        </CardFooter>
      )}
    </Card>
  );
}
