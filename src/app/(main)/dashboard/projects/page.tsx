import { getSnapshot } from "@/lib/workspace/snapshot";

import { WorkspacePage } from "../_workspace/workspace-page";
import { ProjectsTable } from "./_components/projects-table";

export default async function Page() {
  const snap = await getSnapshot();
  const openTasks = Object.fromEntries(
    snap.projects.map((p) => [p.name, snap.tasks.filter((t) => t.project === p.name).length]),
  );

  return (
    <WorkspacePage snap={snap} title="Projects" needs={["PROJECTS.md"]}>
      {snap.projects.length > 0 && <ProjectsTable projects={snap.projects} openTasks={openTasks} />}
    </WorkspacePage>
  );
}
