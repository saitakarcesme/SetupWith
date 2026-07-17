"use client";

import { useState } from "react";
import { Check, Clipboard, KeyRound, LockKeyhole, TerminalSquare } from "lucide-react";
import type { SetupApp } from "@/data/apps";

interface CopyPromptProps {
  app: SetupApp;
}

export function CopyPrompt({ app }: CopyPromptProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(app.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  }

  return (
    <aside className="setup-panel" aria-label={`Install ${app.name} with Codex`}>
      <div className="setup-panel-heading">
        <div>
          <span className="eyebrow">ONE GUIDED RUN</span>
          <h2>Install with Codex</h2>
        </div>
        <TerminalSquare size={22} strokeWidth={1.4} aria-hidden="true" />
      </div>

      <div className="context-status">
        <div>
          <span>Environment</span>
          <strong>Detected by Codex</strong>
        </div>
        <span className="status-dot">On run</span>
      </div>

      <div className="setup-requirements">
        <div>
          <LockKeyhole size={15} aria-hidden="true" />
          <span>Permission checkpoints</span>
          <strong>Included</strong>
        </div>
        <div>
          <KeyRound size={15} aria-hidden="true" />
          <span>Secret references</span>
          <strong>{app.secrets.length || "None"}</strong>
        </div>
      </div>

      <div className={`prompt-preview ${expanded ? "expanded" : ""}`}>
        <div className="prompt-preview-bar">
          <span>SETUP PROMPT / {app.slug}</span>
          <button type="button" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Collapse" : "Review full prompt"}
          </button>
        </div>
        <pre>{app.prompt}</pre>
      </div>

      <button className="copy-prompt-button" type="button" onClick={copyPrompt}>
        {copied ? <Check size={18} aria-hidden="true" /> : <Clipboard size={18} aria-hidden="true" />}
        <span>{copied ? "Copied — ready for Codex" : "Copy setup prompt"}</span>
      </button>
      <p className="setup-note">
        Review the prompt before running it. Codex will still ask before privileged or destructive steps.
      </p>
    </aside>
  );
}
