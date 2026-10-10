import { getSnapshot } from "@/lib/workspace/snapshot";

import { WorkspacePage } from "../_workspace/workspace-page";
import { ProgressView } from "./_components/progress-view";

export default async function Page() {
  const snap = await getSnapshot();

  return (
    <WorkspacePage snap={snap} title="Progress" needs={["STATUS.md", "PROJECTS.md"]} counts={false}>
      <ProgressView
        tasks={snap.tasks}
        projects={snap.projects}
        doneLog={snap.doneLog}
        doneSource={snap.sources.find((s) => s.name === "DONE.md")}
        now={new Date().toISOString()}
      />
    </WorkspacePage>
  );
}
