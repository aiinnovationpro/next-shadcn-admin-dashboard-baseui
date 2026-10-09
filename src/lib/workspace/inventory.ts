import { existsSync, readFileSync } from "node:fs";
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

export function mcpCacheUsable(text: string): boolean {
  try {
    return Array.isArray(JSON.parse(text).servers);
  } catch {
    return false;
  }
}

function cacheUsable(file: string): boolean {
  try {
    return mcpCacheUsable(readFileSync(file, "utf8"));
  } catch {
    return false;
  }
}

// The shared helper is CommonJS and lives in the workspace, so it is loaded by absolute path at runtime
// and never copied or bundled.
export function loadInventory(root: string): Inventory {
  const here = process.cwd();
  try {
    if (!existsSync(join(root, "context", "config.yaml"))) throw new Error("context/config.yaml not found");
    const file = join(root, "reference", "scripts", "lib-workspace.js");
    // Fetched at runtime on purpose: webpack rewrites a static `createRequire` import into a stub that has no `.cache`,
    // which made the whole inventory "unreadable" under `next dev --webpack`.
    const load = process.getBuiltinModule("node:module").createRequire(file);
    delete load.cache[file]; // the helper may have changed since the last request
    const factory = load(file);
    if (typeof factory !== "function") throw new Error("lib-workspace.js does not export a function");
    // ponytail: the helper finds its caches and launch agents through process.cwd(), so it runs with the workspace
    // as cwd. Safe because everything below is synchronous; use a child process if any of it ever awaits.
    process.chdir(root);
    // The helper's mcpServers() runs `claude mcp list` (about 4 s) and rewrites context/.mcp_cache.json unless the
    // cache parses with an array `servers` and MCP_FRESH is unset. The app is read-only, so it only gets there with
    // a cache that is usable as it is, and otherwise shows the config's state; /morning refreshes the cache.
    const live = cacheUsable(join(root, "context", ".mcp_cache.json"));
    const fresh = process.env.MCP_FRESH;
    delete process.env.MCP_FRESH;
    try {
      return build(factory(root), live);
    } finally {
      if (fresh !== undefined) process.env.MCP_FRESH = fresh;
    }
  } catch (error) {
    return { state: "unreadable", reason: error instanceof Error ? error.message : String(error) };
  } finally {
    process.chdir(here);
  }
}
