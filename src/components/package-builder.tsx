"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Check, Copy, LockKeyhole, Minus, Plus, Search } from "lucide-react";
import {
  createPackageAction,
  initialPackageActionState,
} from "@/app/account/packages/actions";
import {
  composePackagePrompt,
  containsLikelySecret,
  MAX_PACKAGE_APPS,
  type PackageAppSummary,
} from "@/lib/custom-packages";

interface PackageBuilderProps {
  apps: PackageAppSummary[];
  authConfigured: boolean;
  signedIn: boolean;
}

const DRAFT_KEY = "setupwith.package-draft.v1";

const packageExperiences = [
  { id: "all", label: "All" },
  { id: "software", label: "Software" },
  { id: "ai", label: "AI Lab" },
  { id: "gaming", label: "Gaming" },
  { id: "entertainment", label: "Entertainment" },
  { id: "work", label: "Work" },
  { id: "creative", label: "Creative" },
  { id: "social", label: "Social" },
  { id: "browsers", label: "Browsers" },
  { id: "hardware", label: "Hardware" },
] as const;

type PackageExperience = (typeof packageExperiences)[number]["id"];

function takeBalancedApps(apps: readonly PackageAppSummary[], limit: number): PackageAppSummary[] {
  const groups = packageExperiences
    .filter((experience) => experience.id !== "all")
    .map((experience) => apps.filter((app) => app.vertical === experience.id));
  const balanced: PackageAppSummary[] = [];
  let row = 0;

  while (balanced.length < limit && groups.some((group) => row < group.length)) {
    for (const group of groups) {
      if (group[row]) balanced.push(group[row]);
      if (balanced.length === limit) break;
    }
    row += 1;
  }

  return balanced;
}

export function PackageBuilder({ apps, authConfigured, signedIn }: PackageBuilderProps) {
  const [query, setQuery] = useState("");
  const [experience, setExperience] = useState<PackageExperience>("all");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instruction, setInstruction] = useState("");
  const [copied, setCopied] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [state, formAction, pending] = useActionState(createPackageAction, initialPackageActionState);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as {
          selectedSlugs?: unknown;
          name?: unknown;
        } | null;
        if (stored) {
          if (Array.isArray(stored.selectedSlugs)) {
            const catalogSlugs = new Set(apps.map((app) => app.slug));
            setSelectedSlugs(
              stored.selectedSlugs
                .filter((slug): slug is string => typeof slug === "string" && catalogSlugs.has(slug))
                .slice(0, MAX_PACKAGE_APPS),
            );
          }
          if (typeof stored.name === "string") setName(stored.name.slice(0, 60));
        }
      } catch {
        sessionStorage.removeItem(DRAFT_KEY);
      } finally {
        setDraftReady(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [apps]);

  useEffect(() => {
    if (!draftReady) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ selectedSlugs, name }));
    } catch {
      // Storage can be disabled by browser policy; package creation still works.
    }
  }, [draftReady, name, selectedSlugs]);

  const selectedApps = useMemo(() => {
    return selectedSlugs
      .map((slug) => apps.find((app) => app.slug === slug))
      .filter((app): app is PackageAppSummary => app !== undefined);
  }, [apps, selectedSlugs]);

  const normalizedQuery = query.trim().toLowerCase();
  const matchingApps = apps.filter((app) => (
      (experience === "all" || app.vertical === experience)
      && (
      !normalizedQuery
      || app.name.toLowerCase().includes(normalizedQuery)
      || app.category.toLowerCase().includes(normalizedQuery)
      || app.description.toLowerCase().includes(normalizedQuery)
      )
    ));
  const visibleApps = normalizedQuery || experience !== "all"
    ? matchingApps.slice(0, 120)
    : takeBalancedApps(matchingApps, 120);
  const prompt = composePackagePrompt(
    { name: name || "My setup", description, instruction },
    selectedApps,
  );
  const secretWarning = containsLikelySecret(description) || containsLikelySecret(instruction);
  const canGenerate = selectedApps.length >= 2 && !secretWarning;

  function toggleApp(slug: string) {
    setSelectedSlugs((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      if (current.length >= MAX_PACKAGE_APPS) return current;
      return [...current, slug];
    });
  }

  async function copyPrompt() {
    if (!canGenerate) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="package-builder">
      <section className="package-builder-form" aria-labelledby="package-details-title">
        <div className="package-section-heading">
          <span>01</span>
          <div>
            <h2 id="package-details-title">Name the setup.</h2>
            <p>Create one reusable brief for a group of apps. Raw credentials never belong here.</p>
          </div>
        </div>
        <div className="package-fields">
          <label>
            <span>Package name</span>
            <input
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              placeholder="Studio workstation"
              value={name}
            />
          </label>
          <label>
            <span>Outcome</span>
            <input
              maxLength={160}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="A complete editing and publishing workspace"
              value={description}
            />
          </label>
          <label className="package-field-wide">
            <span>Shared instruction <i>optional</i></span>
            <textarea
              maxLength={480}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="Reuse my existing project folders and prefer native Apple Silicon builds."
              rows={3}
              value={instruction}
            />
          </label>
        </div>
      </section>

      <section className="package-app-picker" aria-labelledby="package-apps-title">
        <div className="package-section-heading">
          <span>02</span>
          <div>
            <h2 id="package-apps-title">Choose the apps.</h2>
            <p>Select 2–{MAX_PACKAGE_APPS}. SetupWith deduplicates the shared preflight and safety handoffs.</p>
          </div>
          <strong aria-live="polite">{selectedApps.length}/{MAX_PACKAGE_APPS}</strong>
        </div>

        <label className="package-search">
          <Search aria-hidden="true" size={17} />
          <span className="sr-only">Search applications</span>
          <input
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the catalog"
            value={query}
          />
        </label>

        <div className="package-experience-switcher" aria-label="Filter package apps by experience" role="group">
          {packageExperiences.map((item) => (
            <button
              aria-pressed={experience === item.id}
              className={experience === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setExperience(item.id)}
              type="button"
            >
              {item.label}
              <span>{item.id === "all" ? apps.length : apps.filter((app) => app.vertical === item.id).length}</span>
            </button>
          ))}
        </div>

        {selectedApps.length > 0 ? (
          <div className="package-selection-strip" aria-label="Selected applications">
            {selectedApps.map((app) => (
              <button key={app.slug} onClick={() => toggleApp(app.slug)} type="button">
                {app.name}
                <Minus aria-hidden="true" size={13} />
              </button>
            ))}
          </div>
        ) : null}

        <div className="package-app-grid">
          {visibleApps.map((app) => {
            const selected = selectedSlugs.includes(app.slug);
            const disabled = !selected && selectedSlugs.length >= MAX_PACKAGE_APPS;
            return (
              <button
                aria-pressed={selected}
                className={selected ? "selected" : ""}
                disabled={disabled}
                key={app.slug}
                onClick={() => toggleApp(app.slug)}
                style={{ "--app-accent": app.accent } as React.CSSProperties}
                type="button"
              >
                <Image
                  alt=""
                  height={34}
                  src={`/app-logos/${app.slug}.svg`}
                  unoptimized
                  width={34}
                />
                <span><strong>{app.name}</strong><small>{app.category}</small></span>
                <i>{selected ? <Check aria-hidden="true" size={15} /> : <Plus aria-hidden="true" size={15} />}</i>
              </button>
            );
          })}
        </div>
        <p className="package-result-note" aria-live="polite">
          Showing {visibleApps.length} of {matchingApps.length} matching apps.
          {matchingApps.length > visibleApps.length ? " Search by name or choose an experience to narrow the catalog." : ""}
        </p>
      </section>

      <section className="package-output" aria-labelledby="package-output-title">
        <div className="package-section-heading">
          <span>03</span>
          <div>
            <h2 id="package-output-title">One coordinated prompt.</h2>
            <p>Copy it now, or sign in to keep this package in your private library.</p>
          </div>
        </div>

        <div className="package-prompt-preview">
          {secretWarning ? (
            <p>Remove credentials or secret-looking values. Use prompt-safe secret:// references instead.</p>
          ) : canGenerate ? (
            <pre>{prompt}</pre>
          ) : (
            <p>Select at least two apps to generate the combined prompt.</p>
          )}
          <button disabled={!canGenerate} onClick={copyPrompt} type="button">
            {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
            {copied ? "Copied" : "Copy common prompt"}
          </button>
        </div>

        {signedIn ? (
          <form action={formAction} className="package-save-row">
            <input name="name" type="hidden" value={name} />
            <input name="description" type="hidden" value={description} />
            <input name="instruction" type="hidden" value={instruction} />
            <input name="appSlugs" type="hidden" value={selectedSlugs.join(",")} />
            <p aria-live="polite" role={state.error ? "alert" : undefined}>
              {state.error || "Saved packages stay private to your account."}
            </p>
            <button disabled={pending || !canGenerate || !name.trim()} type="submit">
              {pending ? "Saving…" : "Save to my library"}
            </button>
          </form>
        ) : (
          <div className="package-account-callout">
            <LockKeyhole aria-hidden="true" size={18} />
            <p>
              {authConfigured
                ? "Create an account to name, save, and reuse packages across sessions."
                : "Account saving is being configured. You can still build and copy every combined prompt now."}
            </p>
            {authConfigured ? <Link href="/sign-up?redirect_url=/packages/new">Create account</Link> : null}
          </div>
        )}
      </section>
    </div>
  );
}
