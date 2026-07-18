"use client";

import { useState } from "react";
import { Check, Clipboard, GitBranch, ListChecks, ShieldCheck, TerminalSquare } from "lucide-react";
import type { OpenSourceProject } from "@/data/open-source";

interface CopyOpenSourcePromptProps {
  project: OpenSourceProject;
}

export function CopyOpenSourcePrompt({ project }: CopyOpenSourcePromptProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [expanded, setExpanded] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(project.prompt);
      setCopyState("copied");
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = project.prompt;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.appendChild(fallback);
      fallback.select();
      const succeeded = document.execCommand("copy");
      fallback.remove();
      setCopyState(succeeded ? "copied" : "error");
    }
  }

  return (
    <aside className="setup-panel" aria-label={`Set up ${project.name} from source with Codex`}>
      <div className="setup-panel-heading">
        <div>
          <span className="eyebrow">REVIEWABLE SOURCE RUN</span>
          <h2>Set up with Codex</h2>
        </div>
        <TerminalSquare size={22} strokeWidth={1.4} aria-hidden="true" />
      </div>

      <div className="context-status">
        <div>
          <span>First action</span>
          <strong>Review and plan</strong>
        </div>
        <span className="status-dot">Approval gate</span>
      </div>

      <div className="setup-requirements">
        <div>
          <GitBranch size={15} aria-hidden="true" />
          <span>Clone integrity</span>
          <strong>Verified origin</strong>
        </div>
        <div>
          <ListChecks size={15} aria-hidden="true" />
          <span>Setup and test</span>
          <strong>Evidence required</strong>
        </div>
      </div>

      <div className={`prompt-preview ${expanded ? "expanded" : ""}`}>
        <div className="prompt-preview-bar">
          <span>OPEN SOURCE PROMPT / {project.slug}</span>
          <button
            aria-controls={`open-source-prompt-${project.slug}`}
            aria-expanded={expanded}
            type="button"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Collapse" : "Review full prompt"}
          </button>
        </div>
        <pre id={`open-source-prompt-${project.slug}`}>{project.prompt}</pre>
      </div>

      <button className="copy-prompt-button" type="button" onClick={copyPrompt}>
        {copyState === "copied" ? <Check size={18} aria-hidden="true" /> : <Clipboard size={18} aria-hidden="true" />}
        <span aria-live="polite">
          {copyState === "copied"
            ? "Copied — ready for Codex"
            : copyState === "error"
              ? "Copy blocked — review prompt"
              : "Copy source setup prompt"}
        </span>
      </button>
      <p className="setup-note">
        <ShieldCheck size={12} aria-hidden="true" /> Review the plan before approving clone, dependencies, services, or tests.
      </p>
    </aside>
  );
}
