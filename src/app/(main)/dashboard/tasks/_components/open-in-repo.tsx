"use client";

import { ChevronDown, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "@/lib/workspace/reader";
import type { Repo } from "@/lib/workspace/repos";

// The Claude Code extension's URI handler has no folder parameter: it opens in the focused window.
// So the folder opens first, and the prompt follows once that window is focused. A new window also has to
// finish starting before the extension wakes (activation: onStartupFinished), so it gets the longer wait.
const CLAUDE_DELAY_MS = { sameWindow: 1500, newWindow: 4000 };

function promptFor(task: Task) {
  const context = task.context ? ` Context: ${task.context}` : "";
  return (
    `Task from the Akutu dashboard (project: ${task.project}): ${task.headline}.${context} ` +
    "When something real happens, update this repo's AGENT-STATUS.md; the task itself lives in Akutu_2 context/STATUS.md."
  );
}

// Links only: the browser hands vscode:// to VS Code. Nothing is written and the server starts no process.
// The prompt is prefilled, not sent, so ingested text in a task is read before anything runs. It is also
// copied to the clipboard, so a panel that opens empty is one paste away.
// `windowId=_blank` is VS Code's own "open in a new window" flag for protocol links (app#handleProtocolUrl).
function open(repo: Repo, task: Task, newWindow: boolean) {
  const prompt = promptFor(task);
  navigator.clipboard?.writeText(prompt).catch(() => {
    // clipboard refused (no focus or permission): the prefilled panel still carries the prompt
  });
  window.location.href = `vscode://file${encodeURI(repo.path)}/${newWindow ? "?windowId=_blank" : ""}`;
  window.setTimeout(
    () => {
      window.location.href = `vscode://anthropic.claude-code/open?prompt=${encodeURIComponent(prompt)}`;
    },
    newWindow ? CLAUDE_DELAY_MS.newWindow : CLAUDE_DELAY_MS.sameWindow,
  );
}

export function OpenInRepo({ task, repos, newWindow }: { task: Task; repos: Repo[]; newWindow: boolean }) {
  const label = `Start "${task.headline}" in VS Code with Claude`;
  if (repos.length === 1) {
    return (
      <Button
        size="sm"
        aria-label={label}
        title={`Open in ${repos[0].name}`}
        onClick={() => open(repos[0], task, newWindow)}
      >
        <Play />
        Start
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" aria-label={label} title="Choose a repo" />}>
        <Play />
        Start
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-48">
        {/* w-auto: repo folder names stay on one line */}
        {repos.map((r) => (
          <DropdownMenuItem key={r.path} onClick={() => open(r, task, newWindow)}>
            {r.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
