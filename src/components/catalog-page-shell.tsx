"use client";

import { useState } from "react";
import { CatalogExplorer } from "@/components/catalog-explorer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  categories,
  experiences,
  type CatalogExperienceFilter,
  type SetupApp,
  type SetupBundle,
} from "@/data/apps";

interface CatalogPageShellProps {
  apps: SetupApp[];
  bundles: SetupBundle[];
  initialCategory?: string;
  initialExperience?: string;
  initialQuery?: string;
}

const experienceCopy: Record<CatalogExperienceFilter, { eyebrow: string; title: string; description: string }> = {
  all: {
    eyebrow: "THE WHOLE CATALOG",
    title: "Anything worth setting up.",
    description: "Software, AI, games, media, workspaces, creative tools, browsers, and devices—each with a Codex-ready setup path.",
  },
  software: {
    eyebrow: "SOFTWARE",
    title: "Software worth setting up.",
    description: "Developer tools, runtimes, databases, infrastructure, security utilities, and self-hosted apps from verified official sources.",
  },
  ai: {
    eyebrow: "AI LAB",
    title: "AI stacks, ready to run.",
    description: "Local models, visual workflows, inference runtimes, and evaluation tools configured around your hardware and existing environment.",
  },
  gaming: {
    eyebrow: "GAMING",
    title: "Launchers, ready to play.",
    description: "Codex can download, verify, install, and launch popular game clients—then hand control back before sign-in, purchases, or anti-cheat changes.",
  },
  entertainment: {
    eyebrow: "ENTERTAINMENT",
    title: "Your media, set up.",
    description: "Music, streaming, video, and reading apps installed from official stores or configured as safe web apps when no native client exists.",
  },
  work: {
    eyebrow: "WORK & CLOUD",
    title: "Workspaces, ready to focus.",
    description: "Cloud drives, planning tools, and productivity apps coordinated without overwriting profiles, accounts, or synchronized files.",
  },
  creative: {
    eyebrow: "CREATIVE STUDIO",
    title: "Creative tools, ready to make.",
    description: "Design, video, audio, and game-creation suites installed with storage, plug-in, driver, and project-library boundaries made explicit.",
  },
  social: {
    eyebrow: "SOCIAL",
    title: "Stay connected, safely.",
    description: "Popular communication clients installed and opened to the handoff point while sign-in, permissions, and account linking remain yours.",
  },
  browsers: {
    eyebrow: "BROWSERS",
    title: "The web, set up your way.",
    description: "Official browsers installed without silently importing profiles, changing defaults, enabling sync, or replacing your existing browser.",
  },
  hardware: {
    eyebrow: "DEVICES & HARDWARE",
    title: "Devices, configured with care.",
    description: "Vendor utilities prepared with separate approval for drivers, kernel extensions, background services, firmware, and restarts.",
  },
};

function normalizeExperience(value?: string): CatalogExperienceFilter {
  return experiences.some((experience) => experience.id === value)
    ? value as CatalogExperienceFilter
    : "all";
}

export function CatalogPageShell({
  apps,
  bundles,
  initialCategory = "All",
  initialExperience,
  initialQuery = "",
}: CatalogPageShellProps) {
  const [experience, setExperience] = useState<CatalogExperienceFilter>(() => normalizeExperience(initialExperience));
  const copy = experienceCopy[experience];
  const experienceApps = experience === "all" ? apps : apps.filter((app) => app.vertical === experience);
  const appBySlug = new Map(apps.map((app) => [app.slug, app]));
  const experienceBundles = experience === "all"
    ? bundles
    : bundles.filter((bundle) => (
      bundle.vertical === experience
      || bundle.appSlugs.some((slug) => appBySlug.get(slug)?.vertical === experience)
    ));
  const categoryCount = categories.filter(
    (category) => category !== "All" && experienceApps.some((app) => app.category === category),
  ).length;

  function changeExperience(nextExperience: CatalogExperienceFilter) {
    setExperience(nextExperience);
    const url = new URL(window.location.href);
    if (nextExperience === "all") url.searchParams.delete("experience");
    else url.searchParams.set("experience", nextExperience);
    url.searchParams.delete("category");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div className="catalog-experience-shell" data-experience={experience}>
      <SiteHeader />
      <main className="catalog-page">
        <section className="catalog-hero shell">
          <div className="catalog-hero-index">001—{apps.length}</div>
          <div>
            <span className="eyebrow">{copy.eyebrow} / V3.0</span>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
          <dl>
            <div><dt>Setups</dt><dd>{experienceApps.length}</dd></div>
            <div><dt>Bundles</dt><dd>{experienceBundles.length}</dd></div>
            <div><dt>Categories</dt><dd>{categoryCount}</dd></div>
            <div><dt>Sources</dt><dd>Official</dd></div>
          </dl>
        </section>
        <section className="shell catalog-body">
          <CatalogExplorer
            apps={apps}
            bundles={bundles}
            experience={experience}
            initialQuery={initialQuery}
            initialCategory={initialCategory}
            onExperienceChange={changeExperience}
          />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
