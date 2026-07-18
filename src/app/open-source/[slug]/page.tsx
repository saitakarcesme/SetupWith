import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  FileSearch,
  GitBranch,
  Globe2,
  RotateCcw,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import { CopyOpenSourcePrompt } from "@/components/copy-open-source-prompt";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TypingHeadline } from "@/components/typing-headline";
import {
  getOpenSourceLogoUrl,
  getOpenSourceProject,
  openSourceProjects,
} from "@/data/open-source";

export const dynamicParams = false;

export function generateStaticParams() {
  return openSourceProjects.map((project) => ({ slug: project.slug }));
}

interface OpenSourceDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: OpenSourceDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getOpenSourceProject(slug);
  if (!project) return {};

  return {
    title: `Set up ${project.name} from source with Codex`,
    description: `${project.description} Review, clone, set up, test, and roll back with a permission-aware Codex prompt.`,
    alternates: { canonical: `/open-source/${project.slug}` },
  };
}

export default async function OpenSourceDetailPage({ params }: OpenSourceDetailPageProps) {
  const { slug } = await params;
  const project = getOpenSourceProject(slug);
  if (!project) notFound();

  return (
    <div className="catalog-experience-shell" data-experience="software">
      <SiteHeader />
      <main className="app-detail-page" style={{ "--app-accent": project.accent } as React.CSSProperties}>
        <section className={`app-hero pattern-${project.pattern}`}>
          <div className="app-hero-pattern" aria-hidden="true" />
          <div className="shell app-hero-inner">
            <Link className="back-link" href="/open-source">
              <ArrowLeft size={14} aria-hidden="true" /> All open source
            </Link>
            <div className="app-hero-main">
              <div className="app-hero-logo">
                <Image
                  className="app-logo"
                  src={getOpenSourceLogoUrl(project)}
                  alt={`${project.name} logo`}
                  width={96}
                  height={96}
                  priority
                  unoptimized
                />
              </div>
              <div>
                <div className="app-hero-tags">
                  <span>{project.category}</span>
                  <span>Open source</span>
                  <span>GitHub reviewed {project.starsAsOf}</span>
                </div>
                <TypingHeadline>{project.name}</TypingHeadline>
                <p>{project.description}</p>
              </div>
            </div>
            <div className="app-hero-index">
              {String(project.index).padStart(3, "0")}<span>/{openSourceProjects.length}</span>
            </div>
          </div>
        </section>

        <section className="app-meta-strip">
          <div
            className="shell"
            style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr)) auto auto" }}
          >
            <div><span>Popularity</span><strong>{project.popularitySignal}</strong></div>
            <div><span>Evidence date</span><strong>{project.starsAsOf}</strong></div>
            <div><span>Workflow</span><strong>Review / clone / setup / test</strong></div>
            <a href={project.repo} target="_blank" rel="noreferrer">
              <GitBranch size={15} aria-hidden="true" /> GitHub <ArrowUpRight size={13} aria-hidden="true" />
            </a>
            <a href={project.website} target="_blank" rel="noreferrer">
              <Globe2 size={15} aria-hidden="true" /> Website <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </div>
        </section>

        <div className="shell app-content-grid">
          <div className="app-content">
            <section className="detail-section intro-section">
              <span className="detail-index">01</span>
              <div>
                <span className="eyebrow">REVIEW BEFORE RUN</span>
                <h2>Read the project before changing the machine.</h2>
                <p>
                  Codex starts with the repository README, license, releases, lockfiles, and documented setup
                  commands. It then shows the exact target path, prerequisites, downloads, privileges, services,
                  ports, verification, and rollback before running anything.
                </p>
                <div className="requirements-grid">
                  <div><GitBranch size={15} aria-hidden="true" /><span>Official repository</span><small>{project.repo}</small></div>
                  <div><Globe2 size={15} aria-hidden="true" /><span>Official website</span><small>{project.website}</small></div>
                  <div><FileSearch size={15} aria-hidden="true" /><span>README and lockfiles</span><small>Source of truth</small></div>
                  <div><TerminalSquare size={15} aria-hidden="true" /><span>Commands shown first</span><small>Approval required</small></div>
                </div>
              </div>
            </section>

            <section className="detail-section">
              <span className="detail-index">02</span>
              <div>
                <span className="eyebrow">SAFE CHECKOUT</span>
                <h2>Clone without erasing what is already there.</h2>
                <p>
                  The prompt checks the destination, Git origin, branch, commit, and working-tree state first.
                  Existing folders and local changes are reported and preserved—never replaced with a reset or
                  forced checkout.
                </p>
                <p className="detail-callout">
                  <ShieldCheck size={18} aria-hidden="true" /> A dirty working tree, mismatched origin, ambiguous
                  documentation, or conflicting prerequisite stops the run for your decision.
                </p>
              </div>
            </section>

            <section className="detail-section">
              <span className="detail-index">03</span>
              <div>
                <span className="eyebrow">CHANGE POLICY</span>
                <h2>Every machine-level change stays visible.</h2>
                <ul className="change-list">
                  <li><span>Clone target</span><strong>Show and approve the directory first</strong></li>
                  <li><span>Dependencies</span><strong>Prefer lockfiles and project-local installs</strong></li>
                  <li><span>Privileges</span><strong>Ask before sudo, admin, or global packages</strong></li>
                  <li><span>Services & ports</span><strong>Explain each background or network change</strong></li>
                  <li><span>Credentials</span><strong>Never print, log, or persist secrets</strong></li>
                  <li><span>User files</span><strong>Never overwrite, reset, or discard local work</strong></li>
                </ul>
              </div>
            </section>

            <section className="detail-section">
              <span className="detail-index">04</span>
              <div>
                <span className="eyebrow">TEST + ROLLBACK</span>
                <h2>Finish with evidence, not assumptions.</h2>
                <div className="verify-grid">
                  <article>
                    <Check size={21} aria-hidden="true" />
                    <h3>Verify</h3>
                    <p>Record origin, branch, commit, version, changed paths, and the smallest documented build, test, lint, or smoke result.</p>
                  </article>
                  <article>
                    <RotateCcw size={21} aria-hidden="true" />
                    <h3>Roll back</h3>
                    <p>Provide exact removal and restore steps for dependencies, generated files, services, and the checkout while preserving user data.</p>
                  </article>
                </div>
              </div>
            </section>
          </div>
          <CopyOpenSourcePrompt project={project} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
