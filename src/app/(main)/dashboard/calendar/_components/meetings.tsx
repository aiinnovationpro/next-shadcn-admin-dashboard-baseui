import type { ReactNode } from "react";

import { formatDay } from "@/lib/workspace/dates";
import type { Morning, Source } from "@/lib/workspace/reader";

import { UnreadableSource } from "../../_workspace/workspace-page";
import { Agenda } from "./agenda";
import { Timeline } from "./timeline";

function Note({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}

// Today's meetings from the morning cache, with every way that cache can fail to be today's. Server-rendered, then
// handed to the day panel, which shows it only when today is the selected day.
export function TodayMeetings({ morning, cache }: { morning: Morning; cache?: Source }) {
  const { agenda, date, fromToday, state } = morning;
  const day = date ? formatDay(date) : null;
  const hasAgenda = agenda.trim() !== "";

  // a cache that exists but cannot be read is not "no agenda yet"
  if (cache && (state === "unreadable" || state === "offloaded")) return <UnreadableSource source={cache} />;
  if (state !== "ok") return <Note>No agenda yet. It appears after the morning briefing runs.</Note>;

  // an old agenda is never shown as today's: it sits behind its own label, closed
  if (!fromToday) {
    return (
      <div className="flex flex-col gap-3">
        <Note>No agenda for today yet. It appears after the next morning briefing.</Note>
        {hasAgenda && (
          <details className="rounded-md border p-3 text-sm">
            <summary className="cursor-pointer font-medium">Agenda from {day ?? "an unknown day"}</summary>
            <div className="mt-3">
              <Agenda html={agenda} />
            </div>
          </details>
        )}
      </div>
    );
  }

  if (!hasAgenda) return <Note>No meetings on today's agenda.</Note>;
  return <Timeline html={agenda} />;
}
