"use client";

import { useState } from "react";
import { Check, ChevronDown, Clipboard, PackageOpen } from "lucide-react";
import type { SetupBundle } from "@/data/apps";

interface BundleCardProps {
  appNames: string[];
  bundle: SetupBundle;
}

export function BundleCard({ appNames, bundle }: BundleCardProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(bundle.prompt);
      setCopyState("copied");
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = bundle.prompt;
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
    <article className="bundle-card" style={{ "--bundle-accent": bundle.accent } as React.CSSProperties}>
      <div className="bundle-card-topline">
        <span>PKG-{String(bundle.index).padStart(2, "0")}</span>
        <span>{bundle.category}</span>
      </div>
      <div className="bundle-card-title">
        <PackageOpen size={26} strokeWidth={1.3} aria-hidden="true" />
        <div>
          <h3>{bundle.name}</h3>
          <p>{bundle.description}</p>
        </div>
      </div>
      <div className="bundle-app-list" aria-label={`${bundle.name} includes`}>
        {appNames.map((name) => <span key={name}>{name}</span>)}
      </div>
      <div className="bundle-card-meta">
        <span>{bundle.installTime}</span>
        <span>{bundle.platforms.join(" · ")}</span>
        <strong>{appNames.length} apps</strong>
      </div>
      <details className="bundle-prompt-preview">
        <summary>
          Review bundle prompt
          <ChevronDown size={15} aria-hidden="true" />
        </summary>
        <pre>{bundle.prompt}</pre>
      </details>
      <button
        aria-live="polite"
        className="bundle-copy-button"
        type="button"
        onClick={copyPrompt}
      >
        {copyState === "copied" ? <Check size={16} aria-hidden="true" /> : <Clipboard size={16} aria-hidden="true" />}
        {copyState === "copied"
          ? "Copied — ready for Codex"
          : copyState === "error"
            ? "Copy blocked — review prompt"
            : "Copy bundle prompt"}
      </button>
    </article>
  );
}
