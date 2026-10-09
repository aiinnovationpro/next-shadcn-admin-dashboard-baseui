import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

export type Connector = {
  name: string;
  purpose: string | null;
  connected: boolean;
  declared: boolean; // named in config.yaml, as opposed to only registered on this machine
  fromPlugin: boolean;
  scope: string | null; // where an undeclared server comes from: a plugin name, "claude.ai", or a command
};
export type Tool = { name: string; installed: boolean; purpose: string | null; base: boolean };
export type Plugin = {
  name: string;
  enabled: boolean;
  market: string | null;
  scope: string | null;
  purpose: string | null;
};
export type Routine = { name: string; purpose: string | null; schedule: string | null; machine: boolean };

export type Inventory =
  | {
      state: "ok";
      connectors: Connector[];
      tools: Tool[];
      plugins: Plugin[];
      routines: Routine[];
      connectorsLive: boolean; // false: no cached server check, connectors show their config.yaml state
    }
  | { state: "unreadable"; reason: string };

type Entry = Record<string, unknown>;
type Helper = {
  KNOWN_CLIS: string[];
  BASE_CLIS: string[];
  norm: (s: unknown) => string;
  installed: (name: string) => boolean;
  readInventory: () => { connectors: Entry[]; clis: Entry[]; plugins: Entry[]; routines: Entry[] };
  mcpServers: () => { name: string; status: boolean }[];
  prettyMcp: (name: string) => { short: string; scope: string; fromPlugin: boolean };
  plugins: () => { name: string; market: string; scope: string; status: boolean }[];
  machineRoutines: () => Entry[];
};

const text = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const key = (s: string) => s.toLowerCase().replace(/\W/g, "");

// Mirrors what reference/scripts/inventory.js shows, so the app and the old dashboard cannot disagree.
function build(h: Helper, live: boolean): Inventory & { state: "ok" } {
  const inv = h.readInventory();

  const connectors: Connector[] = inv.connectors.map((c) => ({
    name: String(c.name),
    purpose: text(c.purpose),
    connected: c.status === true,
    declared: true,
    fromPlugin: false,
    scope: null,
  }));
  for (const server of live ? h.mcpServers() : []) {
    const pretty = h.prettyMcp(server.name);
    const known = connectors.find((c) => key(c.name) === key(server.name) || key(c.name) === key(pretty.short));
    if (known) known.connected = server.status;
    else
      connectors.push({
        name: pretty.short,
        purpose: null,
        connected: server.status,
        declared: false,
        fromPlugin: pretty.fromPlugin,
        scope: text(pretty.scope),
      });
  }

  const listed = inv.clis;
  const tools: Tool[] = [...new Set([...listed.map((c) => String(c.name)), ...h.KNOWN_CLIS])]
    .map((name) => {
      const cfg = listed.find((c) => c.name === name);
      return {
        name,
        installed: h.installed(name),
        purpose: text(cfg?.purpose),
        base: h.BASE_CLIS.includes(name) && !cfg,
        listed: Boolean(cfg),
      };
    })
    .filter((t) => t.installed || t.listed)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ listed: _listed, ...tool }) => tool);

  const registry = h.plugins();
  const plugins: Plugin[] = registry.length
    ? registry.map((p) => ({
        name: p.name,
        enabled: p.status,
        market: text(p.market),
        scope: text(p.scope),
        purpose: null,
      }))
    : inv.plugins.map((p) => ({
        name: String(p.name),
        enabled: p.status === true,
        market: null,
        scope: null,
        purpose: text(p.purpose),
      }));

  const configured = inv.routines.map((r) => ({
    name: String(r.name),
    purpose: text(r.purpose),
    schedule: text(r.schedule),
    machine: false,
  }));
  const onMachine = h
    .machineRoutines()
    .filter((m) => !configured.some((r) => h.norm(r.name) === h.norm(m.name)))
    .map((m) => ({ name: String(m.name), purpose: text(m.purpose), schedule: null, machine: true }));

  return { state: "ok", connectors, tools, plugins, routines: [...configured, ...onMachine], connectorsLive: live };
}

// The shared helper is CommonJS and lives in the workspace, so it is loaded by absolute path at runtime
// and never copied or bundled.
export function loadInventory(root: string): Inventory {
  const here = process.cwd();
  try {
    const file = join(root, "reference", "scripts", "lib-workspace.js");
    const load = createRequire(file);
    delete load.cache[file]; // the helper may have changed since the last request
    const factory = load(file);
    if (typeof factory !== "function") throw new Error("lib-workspace.js does not export a function");
    // ponytail: the helper finds its caches and launch agents through process.cwd(), so it runs with the workspace
    // as cwd. Safe because everything below is synchronous; use a child process if any of it ever awaits.
    if (!existsSync(join(root, "context", "config.yaml"))) throw new Error("context/config.yaml not found");
    process.chdir(root);
    // Without a cached server list the helper would run `claude mcp list` (about 4 s) and write the cache into the
    // workspace. The app is read-only, so it leaves that to /morning and shows the config's state instead.
    return build(factory(root), existsSync(join(root, "context", ".mcp_cache.json")));
  } catch (error) {
    return { state: "unreadable", reason: error instanceof Error ? error.message : String(error) };
  } finally {
    process.chdir(here);
  }
}
