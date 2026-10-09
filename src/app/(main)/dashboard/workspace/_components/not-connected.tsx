import type { ReactNode } from "react";

import type { Connector } from "@/lib/workspace/inventory";

// The servers that are not connected, in closed groups by where they come from. Nothing is dropped and nothing is
// ranked: groups and the servers inside them stay in the order the helper returned them.
function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <details className="group rounded-lg border px-3 py-2 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="font-normal text-muted-foreground tabular-nums">{count}</span>
      </summary>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </details>
  );
}

const names = (list: Connector[]) => list.map((c) => c.name).join(", ");

export function NotConnected({ connectors }: { connectors: Connector[] }) {
  const declared = connectors.filter((c) => c.declared);
  const rest = connectors.filter((c) => !c.declared);
  const claudeAi = rest.filter((c) => !c.fromPlugin && c.scope === "claude.ai");
  const machine = rest.filter((c) => !c.fromPlugin && c.scope !== "claude.ai");
  const plugins = rest.filter((c) => c.fromPlugin);
  const byPlugin = [...new Set(plugins.map((c) => c.scope ?? ""))].map((scope) => ({
    scope,
    servers: plugins.filter((c) => (c.scope ?? "") === scope),
  }));

  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-sm">Not connected, {connectors.length} in all</p>
      {declared.length > 0 && (
        <Group title="Named in config.yaml" count={declared.length}>
          <ul className="flex flex-col gap-2">
            {declared.map((c) => (
              <li key={c.name} className="flex flex-col gap-0.5">
                <span className="break-all font-medium">{c.name}</span>
                {c.purpose && <span className="text-muted-foreground">{c.purpose}</span>}
              </li>
            ))}
          </ul>
        </Group>
      )}
      {claudeAi.length > 0 && (
        <Group title="From claude.ai" count={claudeAi.length}>
          <p className="break-words text-muted-foreground">{names(claudeAi)}</p>
        </Group>
      )}
      {plugins.length > 0 && (
        <Group title={`From plugins, ${byPlugin.length} plugins`} count={plugins.length}>
          {byPlugin.map((g) => (
            <p key={g.scope} className="break-words">
              <span className="font-medium">
                {g.scope || "Unnamed plugin"}{" "}
                <span className="font-normal text-muted-foreground">({g.servers.length})</span>
              </span>
              <span className="block text-muted-foreground">{names(g.servers)}</span>
            </p>
          ))}
        </Group>
      )}
      {machine.length > 0 && (
        <Group title="Registered on this machine" count={machine.length}>
          <p className="break-words text-muted-foreground">{names(machine)}</p>
        </Group>
      )}
    </div>
  );
}
