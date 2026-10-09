import { AlertTriangle, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { getSnapshot } from "@/lib/workspace/snapshot";

import { LiveRefresh } from "../_workspace/live-refresh";
import { WorkspaceNotFound } from "../_workspace/workspace-page";
import { InventoryView } from "./_components/inventory-view";

export default async function Page() {
  const { workspaceFound, inventory } = await getSnapshot();
  if (!workspaceFound) return <WorkspaceNotFound />;

  const nothing =
    inventory.state === "ok" &&
    inventory.connectors.length + inventory.tools.length + inventory.plugins.length + inventory.routines.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh />
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">Workspace</h1>
        <p className="text-muted-foreground text-sm">
          What this machine can do: the systems it is connected to, the tools and plugins installed, and the routines
          that run on a schedule.
        </p>
      </div>

      {inventory.state === "unreadable" && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>The equipment list cannot be shown</AlertTitle>
          <AlertDescription>
            This page is not empty, it is unreadable. Fix the cause and it fills in by itself.
            <code className="mt-1 block break-all font-mono text-xs">{inventory.reason.split("\n")[0]}</code>
          </AlertDescription>
        </Alert>
      )}

      {inventory.state === "ok" && !inventory.connectorsLive && (
        <Alert>
          <Info />
          <AlertTitle>Connector status comes from config.yaml only</AlertTitle>
          <AlertDescription>
            No saved check of the connected servers exists yet, so each connector shows what config.yaml says. That may
            be out of date, and servers registered only on this machine are not listed.
          </AlertDescription>
        </Alert>
      )}

      {inventory.state === "ok" && !nothing && <InventoryView inventory={inventory} />}

      {nothing && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Nothing is set up yet</EmptyTitle>
            <EmptyDescription>
              No connections, tools, plugins or routines are entered in config.yaml, and none were found on this
              machine.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
