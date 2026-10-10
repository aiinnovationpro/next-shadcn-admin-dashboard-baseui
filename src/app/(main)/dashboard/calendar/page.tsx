import { todayIso } from "@/lib/workspace/progress";
import { getSnapshot } from "@/lib/workspace/snapshot";

import { WorkspacePage } from "../_workspace/workspace-page";
import { CalendarView } from "./_components/calendar-view";
import { TodayMeetings } from "./_components/meetings";

export default async function Page() {
  const snap = await getSnapshot();
  const source = (name: string) => snap.sources.find((s) => s.name === name);

  return (
    <WorkspacePage snap={snap} title="Calendar" needs={[]} counts={false}>
      <CalendarView
        today={todayIso()} // worked out here once, so the browser cannot land on another day or month
        tasks={snap.tasks}
        projects={snap.projects}
        doneLog={snap.doneLog}
        journal={snap.journalAll}
        sources={{
          status: source("STATUS.md"),
          projects: source("PROJECTS.md"),
          done: source("DONE.md"),
          journal: source("JOURNAL.md"),
        }}
        meetings={<TodayMeetings morning={snap.morning} cache={source(".mail_cache.json")} />}
      />
    </WorkspacePage>
  );
}
