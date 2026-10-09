// The only workspace files the Start Here route will ever serve: the walkthrough page, its video, and the
// slide deck it links to. A request is looked up in this table; the request never builds a path, so there is
// nothing to traverse. Keys are URLs below the route, values are the same location inside the workspace.

export interface StartHereFile {
  /** Path inside the workspace folder. */
  path: string;
  type: string;
  /** Content-Security-Policy sandbox value for pages, so they stay isolated even when opened on their own. */
  sandbox?: string;
  /** The route adds its own script (and, on request, a dark style) to this page on the way out. */
  injected?: boolean;
}

const DECK = "reference/start-here-deck";

const types: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  png: "image/png",
  svg: "image/svg+xml",
  mp4: "video/mp4",
};

function entry(path: string, sandbox?: string): [string, StartHereFile] {
  return [path, { path, type: types[path.split(".").pop() ?? ""], sandbox }];
}

// The walkthrough page has no script of its own; the route injects one (speed buttons, autoplay). The page still
// has no origin, so that script cannot touch the app around it. Its links open the deck in a new tab.
const page = "allow-scripts allow-popups allow-popups-to-escape-sandbox";
// The deck steps through its slides with a little script, so it may run scripts, still without any origin.
const deck = "allow-scripts";

const walkthrough = entry("START-HERE.html", page);
walkthrough[1].injected = true;

const files = new Map<string, StartHereFile>([
  walkthrough,
  entry(`${DECK}/start-here-walkthrough.mp4`),
  entry(`${DECK}/index.html`, deck),
  entry(`${DECK}/deck.js`),
  entry(`${DECK}/slide-base.css`),
  entry(`${DECK}/anthropic-radar-2026.png`),
  entry(`${DECK}/logos/claude.svg`),
  ...Array.from({ length: 11 }, (_, i) => entry(`${DECK}/slide-${i + 1}.html`, deck)),
]);

/** Look a request up. Anything not in the table, including every `..` attempt, is undefined. */
export function startHereFile(segments: string[]): StartHereFile | undefined {
  return files.get(segments.join("/"));
}
