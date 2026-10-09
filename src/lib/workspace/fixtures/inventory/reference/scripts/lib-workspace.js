// Stub of the shared workspace helper, invented content only. Same shape as the real one:
// module.exports = function (root) { return { ...readers } }, plus a few static exports.
// biome-ignore-all lint/style/noCommonJs: the real helper is CommonJS, and loading it that way is what is under test
const path = require("node:path");

const KNOWN_CLIS = ["gh", "git", "node", "python3"];
const BASE_CLIS = ["git", "node", "python3"];

module.exports = function lib(root) {
  return {
    root,
    KNOWN_CLIS,
    BASE_CLIS,
    norm: (x) =>
      String(x || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ""),
    installed: (name) => ["gh", "git", "node"].includes(name),
    readInventory: () => ({
      connectors: [
        { name: "Acme Mail", purpose: "Mail for the studio", status: true },
        { name: "Acme Chat", purpose: "Team chat", status: false },
      ],
      clis: [
        { name: "gh", purpose: "GitHub from the terminal" },
        { name: "zzz-tool", purpose: "Invented tool" },
      ],
      plugins: [{ name: "cfg-plugin", status: true, purpose: "From the config" }],
      accounts: [],
      repos: [],
      routines: [{ name: "Morning digest", purpose: "Briefing", schedule: "07:00 weekdays" }],
    }),
    // Live status of locally registered servers; "Acme Chat" is connected here, off in the config.
    mcpServers: () => [
      { name: "Acme Chat", status: true },
      { name: "plugin:widgets:widget-server", status: true },
      { name: "claude.ai Notes", status: false },
    ],
    prettyMcp: (name) => {
      const m = name.match(/^plugin:([^:]+):(.+)$/);
      if (m) return { short: m[2], scope: m[1], fromPlugin: true };
      if (/^claude\.ai\s+/i.test(name))
        return { short: name.replace(/^claude\.ai\s+/i, ""), scope: "claude.ai", fromPlugin: false };
      return { short: name, scope: "", fromPlugin: false };
    },
    plugins: () => [
      { name: "gadgets", market: "invented-market", scope: "user", status: false },
      { name: "widgets", market: "invented-market", scope: "user", status: true },
    ],
    // The real helper looks at process.cwd() here, so the stub reports it.
    machineRoutines: () => [
      { name: "Morning digest", purpose: "launchd, nach Zeitplan", status: true, machine: true },
      { name: "nightly-sync", purpose: "crontab, 0 2 * * *", status: true, machine: true },
      {
        name: `watch-${path.basename(process.cwd())}`,
        purpose: "launchd, reagiert auf Datei-Aenderungen",
        status: true,
        machine: true,
      },
    ],
  };
};
