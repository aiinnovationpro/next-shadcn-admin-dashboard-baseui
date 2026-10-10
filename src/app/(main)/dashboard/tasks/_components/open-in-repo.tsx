"use client";

import { useEffect, useState } from "react";

import { ChevronDown, Play, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "@/lib/workspace/reader";
import type { Repo } from "@/lib/workspace/repos";

// Seconds between opening the folder and sending the prompt. The Claude Code extension's URI handler has no
// folder parameter and goes to the last-focused VS Code window, and a new window needs time before the
// extension and its panel are awake (activation: onStartupFinished, 3.5 s measured on 10 Oct; 4 s was too
// short). The countdown on the button shows the wait; "Resend" covers a start slower than this.
const CLAUDE_DELAY_S = { sameWindow: 2, newWindow: 8 };
const RESEND_WINDOW_MS = 120_000;

function promptFor(task: Task) {
  const context = task.context ? ` Context: ${task.context}` : "";
  return (
    `Task from the Akutu dashboard (project: ${task.project}): ${task.headline}.${context} ` +
    "When something real happens, update this repo's AGENT-STATUS.md; the task itself lives in Akutu_2 context/STATUS.md."
  );
}

// Links only: the browser hands vscode:// to VS Code. Nothing is written and the server starts no process.
// `windowId=_blank` is VS Code's own "open in a new window" flag for protocol links (app#handleProtocolUrl).
function openFolder(repo: Repo, newWindow: boolean, prompt: string) {
  navigator.clipboard?.writeText(prompt).catch(() => {
    // clipboard refused (no focus or permission): the prefilled panel still carries the prompt
  });
  window.location.href = `vscode://file${encodeURI(repo.path)}/${newWindow ? "?windowId=_blank" : ""}`;
}

// The prompt is prefilled, not sent, so ingested text in a task is read before anything runs.
function sendToClaude(prompt: string) {
  window.location.href = `vscode://anthropic.claude-code/open?prompt=${encodeURIComponent(prompt)}`;
}

type Phase = { kind: "idle" } | { kind: "counting"; left: number } | { kind: "sent" };

export function OpenInRepo({ task, repos, newWindow }: { task: Task; repos: Repo[]; newWindow: boolean }) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const prompt = promptFor(task);

  useEffect(() => {
    if (phase.kind === "counting") {
      const timer = window.setTimeout(() => {
        if (phase.left > 1) setPhase({ kind: "counting", left: phase.left - 1 });
        else {
          sendToClaude(prompt);
          setPhase({ kind: "sent" });
        }
      }, 1000);
      return () => window.clearTimeout(timer);
    }
    if (phase.kind === "sent") {
      const timer = window.setTimeout(() => setPhase({ kind: "idle" }), RESEND_WINDOW_MS);
      return () => window.clearTimeout(timer);
    }
  }, [phase, prompt]);

  const start = (repo: Repo) => {
    openFolder(repo, newWindow, prompt);
    setPhase({ kind: "counting", left: newWindow ? CLAUDE_DELAY_S.newWindow : CLAUDE_DELAY_S.sameWindow });
  };

  if (phase.kind === "counting") {
    return (
      <Button size="sm" variant="secondary" disabled aria-live="polite" className="tabular-nums">
        Claude in {phase.left}…
      </Button>
    );
  }

  if (phase.kind === "sent") {
    return (
      <Button
        size="sm"
        variant="outline"
        aria-label={`Resend "${task.headline}" to Claude`}
        title="Only if the Claude panel stayed empty: sends the prompt again to the last VS Code window you used"
        onClick={() => sendToClaude(prompt)}
      >
        <RotateCw />
        Resend to Claude
      </Button>
    );
  }

  const label = `Start "${task.headline}": open its repo in VS Code with Claude`;
  if (repos.length === 1) {
    return (
      <Button size="sm" aria-label={label} title={`Open in ${repos[0].name}`} onClick={() => start(repos[0])}>
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
          <DropdownMenuItem key={r.path} onClick={() => start(r)}>
            {r.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
