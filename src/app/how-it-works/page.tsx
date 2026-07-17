import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Clipboard, Search, TerminalSquare } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "How it works",
  description: "How SetupWith turns official project sources and your local context into a tailored Codex setup run.",
};

const steps = [
  { icon: Search, label: "DISCOVER", title: "Choose a real project", body: "Browse 100 installable tools linked to their canonical repository and official site." },
  { icon: Clipboard, label: "CONTEXT", title: "Review the exact prompt", body: "See platform checks, profile preferences, secret aliases, permission gates, verification, and rollback before copying." },
  { icon: TerminalSquare, label: "RUN", title: "Let Codex inspect first", body: "Codex detects the machine and existing configuration, then proposes the safest supported installation path." },
  { icon: Check, label: "VERIFY", title: "Finish with evidence", body: "The run checks the executable, application, service, or endpoint and reports every changed path." },
];

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />
      <main className="info-page">
        <section className="info-hero shell">
          <span className="eyebrow">WORKFLOW / ONE GUIDED RUN</span>
          <h1>From intent to installed.</h1>
          <p>
            SetupWith does not execute a mystery script. It gives Codex a product-specific brief, clear safety
            boundaries, and an outcome to verify.
          </p>
        </section>
        <section className="shell workflow-list">
          {steps.map(({ icon: Icon, label, title, body }, index) => (
            <article key={title}>
              <span className="workflow-index">{String(index + 1).padStart(2, "0")}</span>
              <Icon size={24} strokeWidth={1.25} aria-hidden="true" />
              <small>{label}</small>
              <h2>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
        </section>
        <section className="shell prompt-anatomy">
          <div><span className="eyebrow">PROMPT ANATOMY</span><h2>Six things every setup must know.</h2></div>
          <ol>
            <li><span>01</span><strong>Preflight</strong><p>OS, architecture, shell, package managers, existing install.</p></li>
            <li><span>02</span><strong>Official source</strong><p>Native package, signed release, or canonical repository.</p></li>
            <li><span>03</span><strong>Product configuration</strong><p>Real file paths, services, plugins, integrations, and preferences.</p></li>
            <li><span>04</span><strong>Permission checkpoints</strong><p>Admin access, overwrite, daemon, ports, firewall, browser sign-in.</p></li>
            <li><span>05</span><strong>Verification</strong><p>Product-specific command, application state, service, or endpoint.</p></li>
            <li><span>06</span><strong>Rollback</strong><p>Uninstall and restore guidance that preserves user data.</p></li>
          </ol>
        </section>
        <section className="info-cta shell">
          <div><span className="eyebrow">READY WHEN YOU ARE</span><h2>Find your first setup.</h2></div>
          <Link href="/apps">Browse 100 apps <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
