import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, GitBranch, KeyRound, RotateCcw, ShieldCheck } from "lucide-react";
import { AppCard } from "@/components/app-card";
import { AppLogo } from "@/components/app-logo";
import { CopyPrompt } from "@/components/copy-prompt";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { apps, getApp, getRelatedApps, humanizeKey, secretAlias } from "@/data/apps";

export const dynamicParams = false;

export function generateStaticParams() {
  return apps.map((app) => ({ slug: app.slug }));
}

interface AppPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: AppPageProps): Promise<Metadata> {
  const { slug } = await params;
  const app = getApp(slug);
  if (!app) return {};

  return {
    title: `Install ${app.name} with Codex — SetupWith`,
    description: `${app.description} Get a tailored, permission-aware Codex setup prompt.`,
    alternates: { canonical: `/${app.slug}` },
  };
}

export default async function AppDetailPage({ params }: AppPageProps) {
  const { slug } = await params;
  const app = getApp(slug);
  if (!app) notFound();
  const related = getRelatedApps(app);

  return (
    <>
      <SiteHeader />
      <main className="app-detail-page" style={{ "--app-accent": app.accent } as React.CSSProperties}>
        <section className={`app-hero pattern-${app.pattern}`}>
          <div className="app-hero-pattern" aria-hidden="true" />
          <div className="shell app-hero-inner">
            <Link className="back-link" href="/apps"><ArrowLeft size={14} aria-hidden="true" /> All apps</Link>
            <div className="app-hero-main">
              <div className="app-hero-logo"><AppLogo app={app} size={96} priority /></div>
              <div>
                <div className="app-hero-tags">
                  <span>{app.category}</span>
                  <span>Source linked</span>
                  <span>Prompt v1.0</span>
                </div>
                <h1>{app.name}</h1>
                <p>{app.description}</p>
              </div>
            </div>
            <div className="app-hero-index">{String(app.index).padStart(3, "0")}<span>/100</span></div>
          </div>
        </section>

        <section className="app-meta-strip">
          <div className="shell">
            <div><span>Setup time</span><strong>{app.installTime}</strong></div>
            <div><span>Complexity</span><strong>{app.complexity}</strong></div>
            <div><span>Platforms</span><strong>{app.platforms.join(" / ")}</strong></div>
            <div><span>Secrets</span><strong>{app.secrets.length || "None"}</strong></div>
            <a href={app.repo} target="_blank" rel="noreferrer"><GitBranch size={15} aria-hidden="true" /> Official repository <ArrowUpRight size={13} aria-hidden="true" /></a>
          </div>
        </section>

        <div className="shell app-content-grid">
          <div className="app-content">
            <section className="detail-section intro-section">
              <span className="detail-index">01</span>
              <div>
                <span className="eyebrow">BEFORE CODEX RUNS</span>
                <h2>A setup that checks first.</h2>
                <p>
                  This prompt begins by detecting your operating system, architecture, shell, package managers,
                  and any existing {app.name} installation. Existing configuration is preserved before Codex
                  recommends the safest official install path.
                </p>
              </div>
            </section>

            <section className="detail-section">
              <span className="detail-index">02</span>
              <div>
                <span className="eyebrow">PROFILE CONTEXT</span>
                <h2>Only the context {app.name} needs.</h2>
                <div className="requirements-grid">
                  {app.config.length > 0 ? app.config.map((key) => (
                    <div key={key}><Check size={15} aria-hidden="true" /><span>{humanizeKey(key)}</span><small>Preference</small></div>
                  )) : <div><Check size={15} aria-hidden="true" /><span>No profile fields required</span><small>Automatic</small></div>}
                  {app.secrets.map((secret) => (
                    <div key={secret}><KeyRound size={15} aria-hidden="true" /><span>{secretAlias(secret)}</span><small>Opaque alias</small></div>
                  ))}
                </div>
                <p className="detail-callout"><ShieldCheck size={18} aria-hidden="true" /> Secret values are never written into the generated prompt. Codex receives an alias and asks before use.</p>
              </div>
            </section>

            <section className="detail-section">
              <span className="detail-index">03</span>
              <div>
                <span className="eyebrow">CHANGE POLICY</span>
                <h2>Explicit permission boundaries.</h2>
                <ul className="change-list">
                  <li><span>Admin access</span><strong>Ask before sudo or elevation</strong></li>
                  <li><span>Existing files</span><strong>Back up before overwrite</strong></li>
                  <li><span>Services & ports</span><strong>Explain and request approval</strong></li>
                  <li><span>Credentials</span><strong>Never print, echo, or log</strong></li>
                </ul>
              </div>
            </section>

            <section className="detail-section">
              <span className="detail-index">04</span>
              <div>
                <span className="eyebrow">VERIFY + ROLLBACK</span>
                <h2>Finish with evidence.</h2>
                <div className="verify-grid">
                  <article><Check size={21} aria-hidden="true" /><h3>Verify</h3><p>Confirm the real executable, app, service, or endpoint and report changed paths.</p></article>
                  <article><RotateCcw size={21} aria-hidden="true" /><h3>Roll back</h3><p>Provide exact uninstall and restore steps while preserving user-owned data.</p></article>
                </div>
              </div>
            </section>
          </div>
          <CopyPrompt app={app} />
        </div>

        <section className="related-section shell">
          <div className="section-heading split-heading">
            <div><span className="eyebrow">KEEP BUILDING</span><h2>Related setups.</h2></div>
            <Link href="/apps">View catalog <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className="related-grid">{related.map((item) => <AppCard app={item} key={item.slug} compact />)}</div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
