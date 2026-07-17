import type { Metadata } from "next";
import { CatalogExplorer } from "@/components/catalog-explorer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { apps } from "@/data/apps";

export const metadata: Metadata = {
  title: "App catalog",
  description: "Browse 100 product-specific Codex setup prompts for popular open-source software.",
};

interface AppsPageProps {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
}

export default async function AppsPage({ searchParams }: AppsPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "All";

  return (
    <>
      <SiteHeader />
      <main className="catalog-page">
        <section className="catalog-hero shell">
          <div className="catalog-hero-index">001—100</div>
          <div>
            <span className="eyebrow">OPEN CATALOG / V1.0</span>
            <h1>Software worth setting up.</h1>
            <p>
              Popular repositories, desktop tools, runtimes, databases, and self-hosted apps—each with its own
              Codex-ready setup path.
            </p>
          </div>
          <dl>
            <div><dt>Setups</dt><dd>100</dd></div>
            <div><dt>Categories</dt><dd>10</dd></div>
            <div><dt>Sources</dt><dd>Official</dd></div>
          </dl>
        </section>
        <section className="shell catalog-body">
          <CatalogExplorer apps={apps} initialQuery={query} initialCategory={category} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
