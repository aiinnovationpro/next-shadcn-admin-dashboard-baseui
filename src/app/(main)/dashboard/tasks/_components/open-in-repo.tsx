"use client";

import { SquareTerminal } from "lucide-react";

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
// So the folder opens first, and the prompt follows once VS Code has had time to focus that window.
const CLAUDE_DELAY_MS = 1500;

function promptFor(task: Task) {
  const context = task.context ? ` Context: ${task.context}` : "";
  return (
    `Task from the Akutu dashboard (project: ${task.project}): ${task.headline}.${context} ` +
    "When something real happens, update this repo's AGENT-STATUS.md; the task itself lives in Akutu_2 context/STATUS.md."
  );
}

// Links only: the browser hands vscode:// to VS Code. Nothing is written and the server starts no process.
// The prompt is prefilled, not sent, so ingested text in a task is read before anything runs.
function open(repo: Repo, task: Task) {
  window.location.href = `vscode://file${encodeURI(repo.path)}/`;
  window.setTimeout(() => {
    window.location.href = `vscode://anthropic.claude-code/open?prompt=${encodeURIComponent(promptFor(task))}`;
  }, CLAUDE_DELAY_MS);
}

export function OpenInRepo({ task, repos }: { task: Task; repos: Repo[] }) {
  const label = `Open "${task.headline}" in VS Code with Claude`;
  if (repos.length === 1) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        title={`Open in ${repos[0].name}`}
        onClick={() => open(repos[0], task)}
      >
        <SquareTerminal />
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} title="Choose a repo" />}>
        <SquareTerminal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-48">
        {/* w-auto: repo folder names stay on one line */}
        {repos.map((r) => (
          <DropdownMenuItem key={r.path} onClick={() => open(r, task)}>
            {r.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
