"use client";

import {
  ArrowUpRight,
  BookOpen,
  Check,
  Clipboard,
  FileCode2,
  GitBranch,
  GitFork,
  LoaderCircle,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { RepositoryPromptResult } from "@/lib/github-repository-prompt";

type GeneratorStatus = "idle" | "loading" | "error" | "success";
type CopyStatus = "idle" | "copied" | "error";

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

function repositoryUrlError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a public GitHub repository URL.";
  if (trimmed.length > 300) return "The repository URL is too long.";

  const normalized = /^github\.com\//i.test(trimmed) ? `https://${trimmed}` : trimmed;

  if (/[\\?#]/.test(normalized) || /%[0-9a-f]{2}/i.test(normalized)) {
    return "Use a direct, unencoded repository root URL.";
  }

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);
    const owner = parts[0] ?? "";
    const repository = (parts[1] ?? "").replace(/\.git$/i, "");

    if (
      url.protocol !== "https:" ||
      (host !== "github.com" && host !== "www.github.com") ||
      Boolean(url.username || url.password || url.port) ||
      parts.length !== 2 ||
      /\/{2,}/.test(url.pathname) ||
      !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner) ||
      !/^[A-Za-z0-9._-]{1,100}$/.test(repository) ||
      repository === "." ||
      repository === ".." ||
      url.search ||
      url.hash
    ) {
      return "Use the repository root URL: https://github.com/owner/repository";
    }
  } catch {
    return "Use the repository root URL: https://github.com/owner/repository";
  }

  return null;
}

function isRepositoryPromptResult(value: unknown): value is RepositoryPromptResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RepositoryPromptResult>;
  const repository = candidate.repository as Partial<RepositoryPromptResult["repository"]> | undefined;
  const readme = candidate.readme as Partial<RepositoryPromptResult["readme"]> | undefined;
  const evidence = candidate.evidence as Partial<RepositoryPromptResult["evidence"]> | undefined;
  const isStringArray = (items: unknown): items is string[] =>
    Array.isArray(items) && items.every((item) => typeof item === "string");

  return (
    typeof candidate.prompt === "string" &&
    typeof candidate.generatedAt === "string" &&
    typeof repository?.fullName === "string" &&
    typeof repository.url === "string" &&
    typeof repository.defaultBranch === "string" &&
    typeof repository.stars === "number" &&
    typeof readme?.path === "string" &&
    typeof readme.url === "string" &&
    typeof readme.sha === "string" &&
    isStringArray(evidence?.sections) &&
    isStringArray(evidence.manifests) &&
    isStringArray(evidence.warnings) &&
    typeof evidence.commandBlocks === "number"
  );
}

function apiErrorMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== "object") return fallback;
  const response = value as ApiErrorResponse;
  return typeof response.error?.message === "string" ? response.error.message : fallback;
}

function copyWithLegacyFallback(text: string): boolean {
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto -9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    textarea.remove();
    activeElement?.focus();
  }

  return copied;
}

export function GitHubPromptGenerator() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [status, setStatus] = useState<GeneratorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RepositoryPromptResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const requestRef = useRef<AbortController | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const inputHelpId = useId();
  const inputErrorId = useId();
  const requestStatusId = useId();
  const resultHeadingId = useId();
  const promptId = useId();

  useEffect(() => {
    if (status === "success") resultHeadingRef.current?.focus();
  }, [status]);

  useEffect(() => () => requestRef.current?.abort(), []);

  function resetGeneratedState() {
    requestRef.current?.abort();
    requestRef.current = null;
    setStatus("idle");
    setError(null);
    setResult(null);
    setExpanded(false);
    setCopyStatus("idle");
  }

  async function generatePrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = repositoryUrlError(repositoryUrl);

    if (validationError) {
      setStatus("error");
      setError(validationError);
      setResult(null);
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setStatus("loading");
    setError(null);
    setResult(null);
    setExpanded(false);
    setCopyStatus("idle");

    try {
      const response = await fetch("/api/open-source/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryUrl: repositoryUrl.trim() }),
        signal: controller.signal,
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          apiErrorMessage(payload, "SetupWith could not analyze that repository. Try again shortly."),
        );
      }

      if (!isRepositoryPromptResult(payload)) {
        throw new Error("SetupWith received an incomplete repository analysis. Please try again.");
      }

      if (requestRef.current !== controller) return;
      setResult(payload);
      setStatus("success");
    } catch (requestError) {
      if (controller.signal.aborted || requestRef.current !== controller) return;
      setResult(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "SetupWith could not analyze that repository. Try again shortly.",
      );
      setStatus("error");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  async function copyPrompt() {
    if (!result) return;

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(result.prompt);
      setCopyStatus("copied");
    } catch {
      setCopyStatus(copyWithLegacyFallback(result.prompt) ? "copied" : "error");
    }
  }

  const inputDescribedBy = error ? `${inputHelpId} ${inputErrorId}` : inputHelpId;
  const shortReadmeSha = result?.readme.sha.slice(0, 12);

  return (
    <section className="github-prompt-lab" aria-labelledby="github-prompt-generator-title">
      <div className="github-prompt-intro">
        <span className="eyebrow">README-GROUNDED GENERATOR</span>
        <div className="github-prompt-intro-icon" aria-hidden="true">
          <GitFork size={22} strokeWidth={1.5} />
        </div>
        <h2 id="github-prompt-generator-title">Turn any public repository into a setup prompt.</h2>
        <p>
          Paste a GitHub repository that is not in the catalog. SetupWith reads its README and
          recognized root manifests, then prepares a review-first installation prompt for Codex.
        </p>
      </div>

      <form className="github-prompt-form" onSubmit={generatePrompt} aria-busy={status === "loading"} noValidate>
        <label htmlFor="github-repository-url">Public GitHub repository</label>
        <div className="github-prompt-form-row">
          <div className="github-prompt-input-wrap">
            <GitFork size={17} strokeWidth={1.5} aria-hidden="true" />
            <input
              id="github-repository-url"
              name="repositoryUrl"
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoComplete="url"
              autoCorrect="off"
              spellCheck={false}
              required
              maxLength={300}
              placeholder="https://github.com/owner/repository"
              value={repositoryUrl}
              aria-describedby={inputDescribedBy}
              aria-errormessage={error ? inputErrorId : undefined}
              aria-invalid={Boolean(error)}
              onChange={(event) => {
                setRepositoryUrl(event.target.value);
                if (status !== "idle" || result || error) resetGeneratedState();
              }}
            />
          </div>
          <button type="submit" disabled={status === "loading" || !repositoryUrl.trim()}>
            {status === "loading" ? (
              <LoaderCircle className="github-generator-spinner" size={17} aria-hidden="true" />
            ) : (
              <Sparkles size={17} aria-hidden="true" />
            )}
            {status === "loading" ? "Reading README…" : "Generate setup prompt"}
          </button>
        </div>
        <p id={inputHelpId} className="github-generator-note">
          Public repositories only. SetupWith analyzes documentation; it never runs repository code.
        </p>

        <div id={requestStatusId} className="sr-only" role="status" aria-live="polite">
          {status === "loading"
            ? "Reading the repository README and setup evidence."
            : status === "success"
              ? "Setup prompt generated."
              : ""}
        </div>

        {error ? (
          <div id={inputErrorId} className="github-prompt-error" role="alert">
            <ShieldAlert size={17} aria-hidden="true" />
            <div>
              <strong>Prompt could not be generated</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : null}
      </form>

      {result ? (
        <section className="github-prompt-result" aria-labelledby={resultHeadingId}>
          <header className="github-result-header">
            <div>
              <span className="eyebrow">README ANALYZED</span>
              <h3 id={resultHeadingId} ref={resultHeadingRef} tabIndex={-1}>
                {result.repository.fullName}
              </h3>
              <p>{result.repository.description ?? "No repository description was provided."}</p>
            </div>
            <a href={result.repository.url} target="_blank" rel="noreferrer">
              Open repository <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </header>

          <div className="github-evidence-grid" aria-label="Repository evidence used for this prompt">
            <article className="github-evidence-card">
              <GitBranch size={17} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <span>Default branch</span>
                <strong>{result.repository.defaultBranch}</strong>
                <small>
                  {result.repository.language ?? "Language not declared"} · {result.repository.stars.toLocaleString()} stars
                </small>
              </div>
            </article>

            <article className="github-evidence-card">
              <BookOpen size={17} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <span>README source</span>
                <a href={result.readme.url} target="_blank" rel="noreferrer">
                  {result.readme.path} <ArrowUpRight size={11} aria-hidden="true" />
                </a>
                <small title={result.readme.sha}>Blob {shortReadmeSha}</small>
              </div>
            </article>

            <article className="github-evidence-card">
              <FileCode2 size={17} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <span>Setup evidence</span>
                <strong>
                  {result.evidence.sections.length} sections · {result.evidence.commandBlocks} command blocks
                </strong>
                <small>{result.evidence.manifests.length} recognized root manifests</small>
              </div>
            </article>
          </div>

          <div className="github-evidence-details">
            <div>
              <h4>README sections</h4>
              {result.evidence.sections.length ? (
                <ul className="github-evidence-list">
                  {result.evidence.sections.map((section) => (
                    <li key={section}>{section}</li>
                  ))}
                </ul>
              ) : (
                <p>No named setup section was detected.</p>
              )}
            </div>
            <div>
              <h4>Detected manifests</h4>
              {result.evidence.manifests.length ? (
                <ul className="github-evidence-list">
                  {result.evidence.manifests.map((manifest) => (
                    <li key={manifest}>{manifest}</li>
                  ))}
                </ul>
              ) : (
                <p>No recognized root manifest was detected.</p>
              )}
            </div>
          </div>

          <div className={`github-warning-list ${result.evidence.warnings.length ? "has-warnings" : ""}`}>
            <ShieldAlert size={17} strokeWidth={1.5} aria-hidden="true" />
            <div>
              <h4>{result.evidence.warnings.length ? "Review flags" : "Automatic safety scan"}</h4>
              {result.evidence.warnings.length ? (
                <ul>
                  {result.evidence.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p>No high-risk command pattern was detected automatically. Manual review is still required.</p>
              )}
            </div>
          </div>

          <div className="github-prompt-output">
            <div className={`prompt-preview ${expanded ? "expanded" : ""}`}>
              <div className="prompt-preview-bar">
                <span>README-GROUNDED PROMPT / {result.repository.fullName}</span>
                <button
                  type="button"
                  aria-controls={promptId}
                  aria-expanded={expanded}
                  onClick={() => setExpanded((value) => !value)}
                >
                  {expanded ? "Collapse" : "Review full prompt"}
                </button>
              </div>
              <pre id={promptId} tabIndex={0}>{result.prompt}</pre>
            </div>

            <button className="copy-prompt-button" type="button" onClick={copyPrompt}>
              {copyStatus === "copied" ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                <Clipboard size={18} aria-hidden="true" />
              )}
              <span aria-live="polite">
                {copyStatus === "copied"
                  ? "Copied — ready for Codex"
                  : copyStatus === "error"
                    ? "Copy blocked — select the prompt manually"
                    : "Copy generated setup prompt"}
              </span>
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
