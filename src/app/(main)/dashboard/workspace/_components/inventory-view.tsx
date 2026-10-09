import { Clock, Plug, Puzzle, Wrench } from "lucide-react";

import type { Connector, Inventory, Plugin } from "@/lib/workspace/inventory";

import { InventoryCard, type Row } from "./inventory-card";

type Ok = Extract<Inventory, { state: "ok" }>;

const connected = (n: number, of: number) => `${n} of ${of} connected`;

function connectorText(c: Connector): string | null {
  if (c.purpose) return c.purpose;
  if (c.declared) return null;
  if (c.fromPlugin) return `Comes with the ${c.scope ?? "installed"} plugin`;
  return c.scope ? `Runs via ${c.scope}` : "Registered on this machine";
}

function pluginText(p: Plugin): string | null {
  if (p.purpose) return p.purpose;
  if (!p.market) return null;
  return `Plugin from ${p.market}, installed for ${p.scope === "project" ? "one project" : "you"}`;
}

// Connected first, then the rest, each group in the order the helper returned them. This is grouping, not ranking.
const onFirst = <T,>(items: T[], on: (item: T) => boolean) => [...items.filter(on), ...items.filter((i) => !on(i))];

// Groups with nothing in them are left out rather than drawn empty.
export function InventoryView({ inventory }: { inventory: Ok }) {
  const connectors = onFirst(inventory.connectors, (c) => c.connected);
  const plugins = onFirst(inventory.plugins, (p) => p.enabled);
  const base = inventory.tools.filter((t) => t.base);
  const tools = inventory.tools.filter((t) => !t.base);

  const connectorRows: Row[] = connectors.map((c) => ({
    name: c.name,
    text: connectorText(c),
    badge: { label: c.connected ? "Connected" : "Not connected", on: c.connected },
  }));
  const toolRows: Row[] = tools.map((t) => ({
    name: t.name,
    text: t.purpose,
    badge: t.installed ? undefined : { label: "Not installed", on: false },
  }));
  const pluginRows: Row[] = plugins.map((p) => ({
    name: p.name,
    text: pluginText(p),
    badge: { label: p.enabled ? "Enabled" : "Switched off", on: p.enabled },
  }));
  const routineRows: Row[] = inventory.routines.map((r) => ({
    name: r.name,
    text: r.purpose,
    chip: r.schedule,
    badge: r.machine ? { label: "Set up on this machine", on: false } : undefined,
  }));

  const installed = tools.filter((t) => t.installed).length + base.length;

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      {connectorRows.length > 0 && (
        <InventoryCard
          icon={Plug}
          title="Connected systems"
          summary={connected(inventory.connectors.filter((c) => c.connected).length, inventory.connectors.length)}
          rows={connectorRows}
        />
      )}
      {(toolRows.length > 0 || base.length > 0) && (
        <InventoryCard
          icon={Wrench}
          title="Installed tools"
          summary={`${installed} installed on this machine`}
          rows={toolRows}
          footer={
            base.length > 0 && (
              <p className="text-sm">
                <span className="font-medium">System basics, there without setup:</span>{" "}
                <span className="text-muted-foreground">{base.map((t) => t.name).join(", ")}</span>
              </p>
            )
          }
        />
      )}
      {pluginRows.length > 0 && (
        <InventoryCard
          icon={Puzzle}
          title="Plugins"
          summary={`${inventory.plugins.filter((p) => p.enabled).length} of ${inventory.plugins.length} enabled`}
          rows={pluginRows}
        />
      )}
      {routineRows.length > 0 && (
        <InventoryCard
          icon={Clock}
          title="Routines"
          summary={`${routineRows.length} on a schedule`}
          rows={routineRows}
        />
      )}
    </div>
  );
}
