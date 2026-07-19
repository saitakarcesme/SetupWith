import type { Metadata } from "next";
import { GitHubPromptGenerator } from "@/components/github-prompt-generator";
import { OpenSourceExplorer } from "@/components/open-source-explorer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TypingHeadline } from "@/components/typing-headline";
import {
  openSourceCategories,
  openSourceProjectCards,
  openSourceProjects,
} from "@/data/open-source";

export const metadata: Metadata = {
  title: "Open-source catalog",
  description: "Paste any public GitHub repository to generate a README-backed installation prompt, or explore 50 curated open-source projects.",
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
              Paste any public GitHub repository and SetupWith will read its README before building a
              review-first installation prompt. Or explore fifty curated projects across entertainment,
              productivity, self-hosting, security, development, and more.
            </p>
          </div>
          <dl>
            <div><dt>Projects</dt><dd>{openSourceProjects.length}</dd></div>
            <div><dt>Custom source</dt><dd>Any public repo</dd></div>
            <div><dt>Categories</dt><dd>{openSourceCategories.length - 1}</dd></div>
            <div><dt>Sources</dt><dd>GitHub</dd></div>
            <div><dt>Workflow</dt><dd>Clone / test</dd></div>
          </dl>
        </section>
        <section className="github-generator-section">
          <div className="shell">
            <GitHubPromptGenerator />
          </div>
        </section>
        <section className="shell catalog-body">
          <OpenSourceExplorer categories={openSourceCategories} projects={openSourceProjectCards} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
