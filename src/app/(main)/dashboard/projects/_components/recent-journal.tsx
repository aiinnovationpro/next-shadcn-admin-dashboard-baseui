import { ChevronRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDay } from "@/lib/workspace/dates";
import type { JournalEntry, Source } from "@/lib/workspace/reader";

import { BoldText } from "../../_workspace/bold-text";
import { UnreadableSource } from "../../_workspace/workspace-page";

const OPEN_ENTRIES = 2; // the real bullets run long, so only the newest few start open; the rest are one click away

// Newest first, as the reader returns them. An empty journal renders nothing; an unreadable one says so.
export function RecentJournal({ journal, source }: { journal: JournalEntry[]; source?: Source }) {
  if (source && source.state !== "ok") return <UnreadableSource source={source} />;
  if (journal.length === 0) return null;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Recent journal</CardTitle>
        <CardDescription>
          The latest {journal.length === 1 ? "entry" : `${journal.length} entries`}, newest first.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {journal.map((e, i) => (
          <details key={e.date} open={i < OPEN_ENTRIES} className="group py-2 first:pt-0 last:pb-0">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              <time dateTime={e.date} className="font-medium tabular-nums">
                {formatDay(e.date)}
              </time>
              <span className="text-muted-foreground tabular-nums">
                {e.bullets.length} {e.bullets.length === 1 ? "note" : "notes"}
              </span>
            </summary>
            {e.bullets.length > 0 && (
              <ul className="mt-2 flex list-disc flex-col gap-1.5 break-words pl-10 text-muted-foreground text-sm">
                {e.bullets.map((b) => (
                  <li key={b}>
                    <BoldText text={b} />
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
