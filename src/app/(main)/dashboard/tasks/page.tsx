import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell } from "@/components/ui/table";
import { getSnapshot } from "@/lib/workspace/snapshot";

import { BoldText } from "../_workspace/bold-text";
import { ExpandRow } from "../_workspace/expand-row";
import { WorkspacePage } from "../_workspace/workspace-page";
import { TasksTable } from "./_components/tasks-table";

export default async function Page({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const [snap, { project = "" }] = await Promise.all([getSnapshot(), searchParams]);

  return (
    <WorkspacePage snap={snap} title="Tasks" needs={["STATUS.md"]}>
      {snap.currentFocus && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Current focus</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {snap.currentFocus.split("\n\n").map((p) => (
              <p key={p}>
                <BoldText text={p} />
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {snap.dayPlan && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Day plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1 text-sm">
              {snap.dayPlan.map((l) => (
                <li key={l}>{l.replace(/^- \[[ x]\] /, "")}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {snap.tasks.length > 0 && <TasksTable tasks={snap.tasks} initialProject={project} />}

      {snap.recentlyDone.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-medium text-lg">Recently done</h2>
          <Table>
            <TableBody>
              {snap.recentlyDone.map((d) => (
                <ExpandRow key={d.headline} colSpan={2} detail={d.context || null}>
                  <TableCell className="whitespace-normal">{d.headline}</TableCell>
                  <TableCell>{d.category ? <Badge variant="outline">#{d.category}</Badge> : null}</TableCell>
                </ExpandRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </WorkspacePage>
  );
}
