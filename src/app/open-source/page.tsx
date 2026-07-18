import type { Metadata } from "next";
import { OpenSourceExplorer } from "@/components/open-source-explorer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TypingHeadline } from "@/components/typing-headline";
import { apps } from "@/data/apps";
import {
  openSourceCategories,
  openSourceProjectCards,
  openSourceProjects,
} from "@/data/open-source";

const githubBackedAppCount = apps.filter((app) => app.source.type === "github").length;

export const metadata: Metadata = {
  title: "Open-source catalog",
  description: "Explore 50 useful open-source GitHub projects with reviewable clone, setup, test, and rollback prompts for Codex.",
  alternates: { canonical: "/open-source" },
};

export default function OpenSourcePage() {
  return (
    <div className="catalog-experience-shell" data-experience="software">
      <SiteHeader />
      <main className="catalog-page">
        <section className="catalog-hero shell">
          <div className="catalog-hero-index">OS—{String(openSourceProjects.length).padStart(3, "0")}</div>
          <div>
            <span className="eyebrow">OPEN SOURCE / VERIFIED GITHUB SOURCES</span>
            <TypingHeadline>Clone it. Read it. Run it.</TypingHeadline>
            <p>
              Fifty useful projects across entertainment, games, productivity, self-hosting, security,
              system utilities, development, and automation—each paired with a review-first Codex workflow.
              These are additions to the {githubBackedAppCount} GitHub-backed app recipes already in Apps.
            </p>
          </div>
          <dl>
            <div><dt>Projects</dt><dd>{openSourceProjects.length}</dd></div>
            <div><dt>Existing app repos</dt><dd>{githubBackedAppCount}</dd></div>
            <div><dt>Categories</dt><dd>{openSourceCategories.length - 1}</dd></div>
            <div><dt>Sources</dt><dd>GitHub</dd></div>
            <div><dt>Workflow</dt><dd>Clone / test</dd></div>
          </dl>
        </section>
        <section className="shell catalog-body">
          <OpenSourceExplorer categories={openSourceCategories} projects={openSourceProjectCards} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
