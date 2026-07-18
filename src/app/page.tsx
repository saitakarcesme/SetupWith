import Link from "next/link";
import { ArrowRight, Check, GitBranch, HardDrive, KeyRound, ShieldCheck, Terminal, WandSparkles } from "lucide-react";
import { AppCard } from "@/components/app-card";
import { AppLogo } from "@/components/app-logo";
import { HeroSearch } from "@/components/hero-search";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TypingHeadline } from "@/components/typing-headline";
import { apps, bundles, categories } from "@/data/apps";

const featuredSlugs = [
  "visual-studio-code",
  "ollama",
  "blender",
  "steam",
  "spotify",
  "discord",
  "google-chrome",
  "notion-desktop",
];

const tickerSlugs = [
  "visual-studio-code",
  "ollama",
  "steam",
  "epic-games-store",
  "spotify",
  "apple-music",
  "netflix",
  "discord",
  "google-chrome",
  "notion-desktop",
  "blender",
  "docker-engine",
  "postgresql",
  "home-assistant",
  "obs-studio",
  "vlc-media-player",
];

const featuredApps = featuredSlugs
  .map((slug) => apps.find((app) => app.slug === slug))
  .filter((app): app is (typeof apps)[number] => Boolean(app));

const tickerApps = tickerSlugs
  .map((slug) => apps.find((app) => app.slug === slug))
  .filter((app): app is (typeof apps)[number] => Boolean(app));

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="home-hero">
          <div className="hero-grid-lines" aria-hidden="true" />
          <div className="shell hero-content">
            <div className="hero-kicker">
              <span>OPEN SETUP CATALOG</span>
              <span className="hero-kicker-line" />
              <span>{apps.length} APPS</span>
              <span>V2.0</span>
            </div>
            <TypingHeadline>
              Set up anything.
              <br />
              <span>With your context.</span>
            </TypingHeadline>
            <p className="hero-lede">
              Purpose-built Codex prompts for the apps you actually use—from developer tools and local AI
              to games, media, work, and devices—matched to your machine and explicit approvals.
            </p>
            <HeroSearch apps={apps.map(({ name, slug, category }) => ({ name, slug, category }))} />
            <div className="hero-footnote">
              <span><Check size={13} aria-hidden="true" /> Official sources</span>
              <span><Check size={13} aria-hidden="true" /> Platform-aware</span>
              <span><Check size={13} aria-hidden="true" /> Review before run</span>
            </div>
          </div>
          <div className="hero-side-label" aria-hidden="true">CODEX-READY / 001–{apps.length}</div>
        </section>

        <section className="logo-ticker" aria-label="Featured apps">
          <div className="shell logo-ticker-inner">
            {tickerApps.map((app) => (
              <Link key={app.slug} href={`/${app.slug}`} title={app.name}>
                <AppLogo app={app} size={26} />
                <span>{app.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section shell featured-section">
          <div className="section-heading split-heading">
            <div>
              <span className="eyebrow">CURATED / POPULAR</span>
              <h2>Start with a known tool.</h2>
            </div>
            <div className="section-heading-aside">
              <p>Every page carries a setup path written for that product—not a prompt with the logo swapped.</p>
              <Link href="/apps">Explore all {apps.length} <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
          </div>
          <div className="featured-grid">
            {featuredApps.map((app) => <AppCard key={app.slug} app={app} />)}
          </div>
        </section>

        <section className="context-demo-section">
          <div className="shell context-demo-grid">
            <div className="context-demo-copy">
              <span className="eyebrow inverse">CONTEXT ENGINE / LOCAL FIRST</span>
              <h2>One prompt.<br />Already briefed.</h2>
              <p>
                Build a reusable environment profile once. SetupWith chooses only the fields each app needs and
                keeps credentials behind opaque aliases.
              </p>
              <Link href="/profile">Create your context profile <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className="context-terminal" aria-label="Example SetupWith context handoff">
              <div className="terminal-bar">
                <span>SETUPWITH / CONTEXT PREVIEW</span>
                <span>● READY</span>
              </div>
              <div className="terminal-app-row">
                <AppLogo app={apps.find((app) => app.slug === "github-cli") ?? apps[0]} size={42} />
                <div><span>TARGET</span><strong>GitHub CLI</strong></div>
                <small>03 / {apps.length}</small>
              </div>
              <div className="terminal-rows">
                <div><span>OS</span><strong>Detect at run time</strong><em>automatic</em></div>
                <div><span>Git protocol</span><strong>SSH</strong><em>profile</em></div>
                <div><span>Credential</span><strong>secret://github/token</strong><em>locked</em></div>
                <div><span>Destructive steps</span><strong>Ask first</strong><em>policy</em></div>
              </div>
              <div className="terminal-command"><Terminal size={16} aria-hidden="true" /><code>Ready to copy a product-specific Codex prompt</code></div>
            </div>
          </div>
        </section>

        <section className="local-install-section">
          <div className="shell local-install-grid">
            <div className="local-install-copy">
              <span className="eyebrow inverse">LOCAL MODE / YOUR MACHINE</span>
              <h2>Own the whole prompt-building loop.</h2>
              <p>
                Install SetupWith from its open-source repository when an automation needs personal machine
                context. Build and review the prompt on localhost, keep secret values out of it, then copy only
                the exact instructions you approve into Codex.
              </p>
              <div className="local-install-actions">
                <Link href="/setupwith">Install SetupWith with Codex <ArrowRight size={16} aria-hidden="true" /></Link>
                <a href="https://github.com/saitakarcesme/SetupWith" target="_blank" rel="noreferrer">
                  <GitBranch size={15} aria-hidden="true" /> View source
                </a>
              </div>
            </div>
            <div className="local-install-steps" aria-label="Local SetupWith workflow">
              <article><span>01</span><HardDrive size={20} aria-hidden="true" /><strong>Run on localhost</strong><p>Clone the official repository and bind it to 127.0.0.1.</p></article>
              <article><span>02</span><KeyRound size={20} aria-hidden="true" /><strong>Review local context</strong><p>Non-secret fields are visible; credential values remain outside prompts.</p></article>
              <article><span>03</span><Terminal size={20} aria-hidden="true" /><strong>Hand off deliberately</strong><p>Paste the approved prompt into Codex and keep every privileged step gated.</p></article>
            </div>
          </div>
        </section>

        <section className="section shell process-section">
          <div className="section-heading">
            <span className="eyebrow">HOW IT WORKS</span>
            <h2>From search to verified setup.</h2>
          </div>
          <div className="process-grid">
            <article>
              <span className="process-number">01</span>
              <WandSparkles size={25} strokeWidth={1.3} aria-hidden="true" />
              <h3>Choose the app</h3>
              <p>Pick a verified official source and review exactly what Codex may download or change.</p>
            </article>
            <article>
              <span className="process-number">02</span>
              <KeyRound size={25} strokeWidth={1.3} aria-hidden="true" />
              <h3>Match approved context</h3>
              <p>Use only relevant preferences and secret aliases. Values stay out of the generated prompt.</p>
            </article>
            <article>
              <span className="process-number">03</span>
              <ShieldCheck size={25} strokeWidth={1.3} aria-hidden="true" />
              <h3>Run, verify, roll back</h3>
              <p>Codex checks the machine, requests permission, verifies the result, and reports rollback steps.</p>
            </article>
          </div>
        </section>

        <section className="category-index">
          <div className="shell">
            <div className="category-index-heading">
              <span className="eyebrow">FULL INDEX</span>
              <p>Browse by what you are building.</p>
            </div>
            <div className="category-list">
              {categories.slice(1).map((category, index) => {
                const count = apps.filter((app) => app.category === category).length;
                return (
                  <Link href={`/apps?category=${encodeURIComponent(category)}`} key={category}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{category}</strong>
                    <small>{String(count).padStart(2, "0")} setups</small>
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section shell trust-section">
          <div className="trust-mark"><ShieldCheck size={46} strokeWidth={1} aria-hidden="true" /></div>
          <div>
            <span className="eyebrow">TRUST IS A FEATURE</span>
            <h2>Nothing runs invisibly.</h2>
          </div>
          <div className="trust-copy">
            <p>
              SetupWith prompts stop before sign-in, MFA, payment, large downloads, admin access, drivers,
              anti-cheat, services, firewall changes, and restarts. Secret values stay behind references.
            </p>
            <Link href="/security">Read the security model <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </section>

        <section className="final-cta">
          <div className="shell final-cta-inner">
            <p>{apps.length} official app sources. 50 extra open-source projects. {bundles.length} coordinated bundles.</p>
            <h2>What should Codex set up next?</h2>
            <Link href="/apps">Browse the catalog <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
