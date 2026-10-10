"use client";

import { useEffect, useState } from "react";

import { ChevronDown, Play, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "@/lib/workspace/reader";
import type { Repo } from "@/lib/workspace/repos";

// How long the button offers "Send to Claude" after the folder link, before going back to "Start".
const SEND_WINDOW_MS = 120_000;

function promptFor(task: Task) {
  const context = task.context ? ` Context: ${task.context}` : "";
  return (
    `Task from the Akutu dashboard (project: ${task.project}): ${task.headline}.${context} ` +
    "When something real happens, update this repo's AGENT-STATUS.md; the task itself lives in Akutu_2 context/STATUS.md."
  );
}

// Links only: the browser hands vscode:// to VS Code. Nothing is written and the server starts no process.
// Two clicks, timed by the person, not by a delay: the Claude Code extension's URI handler has no folder
// parameter and goes to the last-focused VS Code window, and a new window takes a few seconds before the
// extension is awake (activation: onStartupFinished; 3.5 s measured on 10 Oct). A timer lost that race.
// `windowId=_blank` is VS Code's own "open in a new window" flag for protocol links (app#handleProtocolUrl).
function openFolder(repo: Repo, newWindow: boolean, prompt: string) {
  navigator.clipboard?.writeText(prompt).catch(() => {
    // clipboard refused (no focus or permission): "Send to Claude" still carries the prompt
  });
  window.location.href = `vscode://file${encodeURI(repo.path)}/${newWindow ? "?windowId=_blank" : ""}`;
}

// The prompt is prefilled, not sent, so ingested text in a task is read before anything runs.
function sendToClaude(prompt: string) {
  window.location.href = `vscode://anthropic.claude-code/open?prompt=${encodeURIComponent(prompt)}`;
}

export function OpenInRepo({ task, repos, newWindow }: { task: Task; repos: Repo[]; newWindow: boolean }) {
  const [opened, setOpened] = useState(false);
  const prompt = promptFor(task);

  useEffect(() => {
    if (!opened) return;
    const timer = window.setTimeout(() => setOpened(false), SEND_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [opened]);

  const start = (repo: Repo) => {
    openFolder(repo, newWindow, prompt);
    setOpened(true);
  };

  if (opened) {
    return (
      <Button
        size="sm"
        aria-label={`Send "${task.headline}" to Claude in the window that just opened`}
        title="Click once VS Code has opened the folder"
        onClick={() => {
          sendToClaude(prompt);
          setOpened(false);
        }}
      >
        <Send />
        Send to Claude
      </Button>
    );
  }

  const label = `Start "${task.headline}": open its repo in VS Code`;
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
