import { type Inventory, loadInventory } from "./inventory.ts";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type DueStatus = "overdue" | "today" | "upcoming";

export type Task = {
  project: string;
  headline: string;
  context: string;
  waitingOn: string | null;
  category: string | null;
  due: string | null; // YYYY-MM-DD
  dueStatus: DueStatus | null;
  stale: boolean; // ⚠️ open for more than a week
};

export type NotUnderstood = { source: string; section: string; line: string };

export type InboxItem = {
  headline: string;
  source: string;
  age: string;
  due: string | null; // YYYY-MM-DD
  stale: boolean;
  mailUrl: string | null;
  context: string;
};

export type DoneItem = { headline: string; category: string | null; context: string };

export type Project = {
  name: string;
  purpose: string;
  status: string;
  statusFirstSentence: string;
  phase: string;
  phaseGroup: string; // the phase without its parenthetical note, for filtering
  stakeholder: string;
  timeline: string;
  blocker: string | null;
  hasBlocker: boolean;
  risk: string | null;
  delta: string | null;
};

export type Source = {
  name: string;
  state: "ok" | "missing" | "unreadable" | "offloaded";
  ageMinutes: number | null;
};

// What /morning last wrote to .mail_cache.json. The fragments are escaped HTML, passed through unchanged;
// an empty string means "not in the cache", so the view collapses it.
export type Morning = {
  state: Source["state"]; // "ok" only when the cache was read and parsed
  date: string | null; // YYYY-MM-DD the cache was written for
  fromToday: boolean; // false for an old (or undated) cache: the view labels it "from [day]"
  mailChecked: boolean; // false in quick mode: there is no mail state to report
  lead: string;
  briefing: string;
  briefingSections: string;
  mailStatus: string;
  agenda: string; // timeline <li>s; each meeting briefing sits inside its <li> as <details class="mb">
};

export type JournalEntry = { date: string; bullets: string[] }; // date: YYYY-MM-DD; bullets: raw markdown text

export type Snapshot = {
  workspaceFound: boolean;
  sources: Source[];
  currentFocus: string;
  dayPlan: string[] | null; // null when no plan is set
  tasks: Task[];
  inbox: InboxItem[];
  recentlyDone: DoneItem[];
  projects: Project[];
  notUnderstood: NotUnderstood[];
  inventory: Inventory;
  morning: Morning;
  journal: JournalEntry[]; // entries from the last 14 days, newest first, at most 10
};

type Flag = (section: string, line: string) => void;

function readSource(root: string, name: string, now: Date): { source: Source; text: string } {
  const file = join(root, "context", name);
  const without = (state: Source["state"]) => ({ source: { name, state, ageMinutes: null }, text: "" });
  if (!existsSync(file)) {
    // macOS leaves ".NAME.icloud" in place of a file it has offloaded to iCloud
    return without(existsSync(join(root, "context", `.${name}.icloud`)) ? "offloaded" : "missing");
  }
  try {
    const text = readFileSync(file, "utf8");
    if (text.trim() === "") return without("unreadable"); // zero bytes: a half-synced file, not a quiet day
    const ageMinutes = Math.round((now.getTime() - statSync(file).mtimeMs) / 60_000);
    return { source: { name, state: "ok", ageMinutes }, text };
  } catch {
    return without("unreadable");
  }
}

const JOURNAL_ENTRIES = 10;
const JOURNAL_DAYS = 14; // an entry exactly this many days old is still kept

// "## YYYY-MM-DD" opens an entry, "- " opens a bullet, an indented line continues it, "###" and "---" are ignored.
// Anything else under an entry, and any "## " heading that is no date, is flagged. The text before the first
// "## " is the file's own header. Only entries from the last 14 days are read, and of those the newest 10 are kept.
function parseJournal(text: string, now: Date, flag: Flag): JournalEntry[] {
  const entries: (JournalEntry & { stray: string[] })[] = [];
  let current: (typeof entries)[number] | null = null;
  let inEntries = false; // past the file header
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (line.startsWith("## ")) {
      inEntries = true;
      const date = line.slice(3).trim();
      current = /^\d{4}-\d{2}-\d{2}$/.test(date) ? { date, bullets: [], stray: [] } : null;
      if (current) entries.push(current);
      else flag("(entry heading)", line);
    } else if (inEntries && t !== "" && t !== "---" && !line.startsWith("### ")) {
      if (!current) flag("(entry heading)", line);
      else if (line.startsWith("- ")) current.bullets.push(line.slice(2).trim());
      else if (line.startsWith("  ") && current.bullets.length > 0)
        current.bullets[current.bullets.length - 1] += ` ${t}`;
      else current.stray.push(line);
    }
  }
  const earliest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - JOURNAL_DAYS);
  const cutoff = iso(earliest.getFullYear(), earliest.getMonth() + 1, earliest.getDate());
  const inWindow = entries.filter((e) => e.date >= cutoff).sort((a, b) => b.date.localeCompare(a.date));
  for (const e of inWindow) for (const line of e.stray) flag(e.date, line); // every entry read, not only those shown
  return inWindow.slice(0, JOURNAL_ENTRIES).map(({ date, bullets }) => ({ date, bullets }));
}

const noMorning = (state: Morning["state"]): Morning => ({
  state,
  date: null,
  fromToday: false,
  mailChecked: false,
  lead: "",
  briefing: "",
  briefingSections: "",
  mailStatus: "",
  agenda: "",
});

// The cache is one JSON object of fragments. Text that is not an object is unreadable, not an empty morning.
function parseMorning(text: string, now: Date): Morning | null {
  let cache: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    cache = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  const str = (key: string) => (typeof cache[key] === "string" ? (cache[key] as string) : "");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str("date")) ? str("date") : null;
  const mailChecked = cache.mail_checked === true;
  return {
    state: "ok",
    date,
    fromToday: date === todayIso(now),
    mailChecked,
    lead: str("BRIEFING_LEAD"),
    briefing: str("BRIEFING"),
    briefingSections: str("BRIEFING_SECTIONS"),
    mailStatus: mailChecked ? str("EMAIL_STATUS") : "",
    agenda: str("AGENDA"),
  };
}

export function readWorkspace(root: string, now: Date = new Date()): Snapshot {
  if (!existsSync(join(root, "context"))) {
    return {
      workspaceFound: false,
      sources: [],
      currentFocus: "",
      dayPlan: null,
      tasks: [],
      inbox: [],
      recentlyDone: [],
      projects: [],
      journal: [],
      notUnderstood: [],
      inventory: loadInventory(root),
      morning: noMorning("missing"),
    };
  }
  const statusFile = readSource(root, "STATUS.md", now);
  const projectsFile = readSource(root, "PROJECTS.md", now);
  const mailCache = readSource(root, ".mail_cache.json", now);
  const journalFile = readSource(root, "JOURNAL.md", now);
  const status = statusFile.text;
  const notUnderstood: NotUnderstood[] = [];
  const flag: Flag = (section, line) => notUnderstood.push({ source: "STATUS.md", section, line });
  if (statusFile.source.state === "ok" && !/^## Tasks \(open\)\s*$/m.test(status)) {
    flag("Tasks (open)", "(section heading not found)");
  }
  const dayPlan = sectionBody(status, "Day Plan");
  let morning = noMorning(mailCache.source.state);
  if (mailCache.source.state === "ok") {
    const parsed = parseMorning(mailCache.text, now);
    if (parsed) morning = parsed;
    else mailCache.source = { name: mailCache.source.name, state: "unreadable", ageMinutes: null };
    morning.state = mailCache.source.state;
  }
  return {
    workspaceFound: true,
    sources: [statusFile.source, projectsFile.source, mailCache.source, journalFile.source],
    projects: parseProjects(projectsFile.text, notUnderstood),
    currentFocus: sectionBody(status, "Current Focus").join("\n\n"),
    dayPlan: dayPlan.length > 0 ? dayPlan : null,
    tasks: parseOpenTasks(sectionBody(status, "Tasks (open)"), now, flag),
    inbox: parseInbox(sectionBody(status, "Inbox"), now, flag),
    recentlyDone: parseRecentlyDone(sectionBody(status, "Recently Done"), now, flag),
    journal: parseJournal(journalFile.text, now, (section, line) =>
      notUnderstood.push({ source: "JOURNAL.md", section, line }),
    ),
    notUnderstood,
    inventory: loadInventory(root),
    morning,
  };
}

// ⚠ with or without its emoji variation selector (U+FE0F)
const STALE_MARK = /⚠️?\s*/;

const PROJECT_FIELDS: Record<string, string> = {
  Purpose: "purpose",
  Status: "status",
  Phase: "phase",
  Stakeholder: "stakeholder",
  Timeline: "timeline",
  Blocker: "blocker",
  Risk: "risk",
  Delta: "delta",
};

// Level-two headings are project blocks, except "History" (finished work). Fields are "**Key:** value" lines.
function parseProjects(text: string, notUnderstood: NotUnderstood[]): Project[] {
  const blocks: { name: string; fields: Record<string, string> }[] = [];
  let current: (typeof blocks)[number] | null = null;

  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) {
      const name = line.slice(3).trim();
      current = name === "History" ? null : { name, fields: {} };
      if (current) blocks.push(current);
      continue;
    }
    const t = line.trim();
    if (!current || t === "" || t === "---" || /^_.*_$/.test(t)) continue;
    const field = t.match(/^\*\*([A-Za-z]+):\*\*\s*(.*)$/);
    if (field && field[1] in PROJECT_FIELDS) {
      current.fields[PROJECT_FIELDS[field[1]]] = field[2].trim();
    } else {
      notUnderstood.push({ source: "PROJECTS.md", section: current.name, line });
    }
  }

  return blocks.map(({ name, fields: f }) => {
    const status = f.status ?? "";
    return {
      name,
      purpose: f.purpose ?? "",
      status,
      statusFirstSentence: status.match(/^.*?(?<![0-9])[.!?](?=\s+[A-Z*`]|$)/)?.[0] ?? status,
      phase: f.phase ?? "",
      phaseGroup: (f.phase ?? "").split(/\s*[(/;]/)[0].trim(),
      stakeholder: f.stakeholder ?? "",
      timeline: f.timeline ?? "",
      blocker: f.blocker ?? null,
      hasBlocker: Boolean(f.blocker) && !/^(none|no blocker|n\/a)\b/i.test(f.blocker),
      risk: f.risk ?? null,
      delta: f.delta ?? null,
    };
  });
}

// Item lines open an item, indented lines continue the latest one, anything else is flagged and ends it,
// so a context line can never attach to an item it does not belong to.
function collect<T extends { context: string }>(
  lines: string[],
  section: string,
  flag: Flag,
  itemFrom: (line: string) => T | null,
  isHeading: (line: string) => boolean = () => false,
): T[] {
  const items: T[] = [];
  let last: T | null = null;
  for (const line of lines) {
    if (isHeading(line)) {
      last = null;
      continue;
    }
    const item = itemFrom(line);
    if (item) {
      items.push(item);
      last = item;
    } else if (line.startsWith("  ") && last) {
      last.context = `${last.context} ${line.trim()}`.trim();
    } else {
      flag(section, line);
      last = null;
    }
  }
  return items;
}

function parseRecentlyDone(lines: string[], now: Date, flag: Flag): DoneItem[] {
  return collect(lines, "Recently Done", flag, (line) => {
    if (!line.startsWith("- [x] ")) return null;
    const { headline, category } = parseTask("", line.slice(6), now);
    return { headline, category, context: "" };
  });
}

// The lines of a "## heading" section, minus blanks, italic header prose and code fences.
function sectionBody(text: string, heading: string): string[] {
  const body: string[] = [];
  let inSection = false;
  let inFence = false;
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) {
      inSection = line === `## ${heading}`;
    } else if (inSection && line.startsWith("```")) {
      inFence = !inFence;
    } else if (inSection && !inFence && line.trim() !== "" && !/^_.*_$/.test(line.trim())) {
      body.push(line);
    }
  }
  return body;
}

function parseOpenTasks(lines: string[], now: Date, flag: Flag): Task[] {
  let project = "";
  const isProjectHeading = (line: string) => {
    if (!line.startsWith("### ")) return false;
    project = line.slice(4).trim();
    return true;
  };
  return collect(
    lines,
    "Tasks (open)",
    flag,
    (line) => (line.startsWith("- [ ] ") ? parseTask(project, line.slice(6), now) : null),
    isProjectHeading,
  );
}

// "- [ ] ⚠️ headline · source · for 25d (due 30.08.) · [Mail](url)", with an indented context line below.
function parseInbox(lines: string[], now: Date, flag: Flag): InboxItem[] {
  return collect(lines, "Inbox", flag, (line) => {
    if (!line.startsWith("- [ ] ")) return null;
    const [text, source = "", age = "", link = ""] = line.slice(6).split(" · ");
    const dueMatch = age.match(/\(due (\d{1,2})\.(\d{1,2})\.\)/);
    return {
      headline: text.replace(STALE_MARK, "").trim(),
      source: source.trim(),
      age: age.replace(/\(due [^)]*\)/, "").trim(),
      due: dueMatch ? resolveDue(Number(dueMatch[1]), Number(dueMatch[2]), now) : null,
      stale: STALE_MARK.test(text),
      mailUrl: link.match(/\]\(([^)]+)\)/)?.[1] ?? null,
      context: "",
    };
  });
}

function parseTask(project: string, text: string, now: Date): Task {
  let headline = text;
  const take = (re: RegExp): RegExpMatchArray | null => {
    const m = headline.match(re);
    if (m) headline = headline.replace(re, " ");
    return m;
  };

  const stale = take(STALE_MARK) !== null;
  const waiting = take(/\(waiting on ([^)]+)\)\s*/);
  const category = take(/\s#(deep-work|quick-win|comms|prep|admin)\b/);
  const dueMatch = take(/\(due (\d{1,2})\.(\d{1,2})\.\)/);
  const due = dueMatch ? resolveDue(Number(dueMatch[1]), Number(dueMatch[2]), now) : null;

  return {
    project,
    headline: headline.replace(/\s+/g, " ").trim(),
    context: "",
    waitingOn: waiting ? waiting[1].trim() : null,
    category: category ? category[1] : null,
    due,
    dueStatus: due ? dueStatus(due, now) : null,
    stale,
  };
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const todayIso = (now: Date) => iso(now.getFullYear(), now.getMonth() + 1, now.getDate());

// A due date is written DD.MM. with no year: take the year that puts it nearest to today.
function resolveDue(day: number, month: number, now: Date): string {
  const year = now.getFullYear();
  const nearest = [year - 1, year, year + 1]
    .map((y) => new Date(y, month - 1, day, 12))
    .reduce((best, d) => (Math.abs(d.getTime() - now.getTime()) < Math.abs(best.getTime() - now.getTime()) ? d : best));
  return iso(nearest.getFullYear(), nearest.getMonth() + 1, nearest.getDate());
}

function dueStatus(due: string, now: Date): DueStatus {
  const today = todayIso(now);
  if (due < today) return "overdue";
  return due === today ? "today" : "upcoming";
}
