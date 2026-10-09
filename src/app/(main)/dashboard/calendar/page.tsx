import type { ReactNode } from "react";

import { formatDay } from "@/lib/workspace/dates";
import type { Morning } from "@/lib/workspace/reader";
import { getSnapshot } from "@/lib/workspace/snapshot";

import { WorkspacePage } from "../_workspace/workspace-page";
import { Agenda } from "./_components/agenda";

function Note({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}

function Body({ morning }: { morning: Morning }) {
  const { agenda, date, fromToday, state } = morning;
  const day = date ? formatDay(date) : null;
  const hasAgenda = agenda.trim() !== "";

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

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-medium text-lg">Today, {day}</h2>
      <Agenda html={agenda} />
    </section>
  );
}

export default async function Page() {
  const snap = await getSnapshot();

  return (
    <WorkspacePage snap={snap} title="Calendar" needs={[]} counts={false}>
      <Body morning={snap.morning} />
    </WorkspacePage>
  );
}
