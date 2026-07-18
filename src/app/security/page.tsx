import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TypingHeadline } from "@/components/typing-headline";

export const metadata: Metadata = {
  title: "Security model",
  description: "How SetupWith handles local context, encrypted credentials, permissions, and setup prompts.",
};

const principles = [
  { icon: EyeOff, title: "No secret values in prompts", body: "Generated prompts carry opaque references such as secret://github/token, never the underlying credential." },
  { icon: LockKeyhole, title: "Encrypted at rest", body: "The local vault uses PBKDF2 and AES-256-GCM. Your passphrase is not stored and cannot be recovered by SetupWith." },
  { icon: KeyRound, title: "Consent at the moment of use", body: "Codex stops before credentials, sign-in, MFA, CAPTCHA, purchases, subscriptions, elevated access, services, drivers, anti-cheat, firewall changes, or restarts." },
  { icon: ShieldCheck, title: "Verification and rollback", body: "Every setup path ends with product-specific checks, a changed-file report, and explicit rollback guidance." },
];

export default function SecurityPage() {
  return (
    <>
      <SiteHeader />
      <main className="info-page">
        <section className="info-hero shell">
          <span className="eyebrow">SECURITY / THREAT MODEL</span>
          <TypingHeadline>Trust begins before install.</TypingHeadline>
          <p>
            SetupWith is designed around a simple boundary: the catalog can know what a tool needs without putting
            your credential values into a generated prompt. Your local preview is not transmitted by SetupWith;
            after you paste it into Codex, the destination service&apos;s data controls apply.
          </p>
        </section>
        <section className="shell principle-grid">
          {principles.map(({ icon: Icon, title, body }, index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <Icon size={27} strokeWidth={1.25} aria-hidden="true" />
              <h2>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
        </section>
        <section className="shell security-details">
          <div>
            <span className="eyebrow">WHAT IS STORED</span>
            <h2>Two layers, deliberately separate.</h2>
          </div>
          <div className="security-table">
            <div><strong>Environment profile</strong><span>OS preference, shell, editor, paths</span><em>Local browser storage</em></div>
            <div><strong>Secret aliases</strong><span>Provider, key name, optional label</span><em>Inside encrypted vault</em></div>
            <div><strong>Secret values</strong><span>Tokens, passwords, private coordinates</span><em>AES-256-GCM ciphertext</em></div>
            <div><strong>Generated prompts</strong><span>Setup instructions and secret:// references</span><em>Clipboard only when requested</em></div>
            <div><strong>Copied context</strong><span>The non-secret fields visible in your preview</span><em>Leaves the local boundary only when you paste it</em></div>
          </div>
        </section>
        <section className="info-cta shell">
          <div><span className="eyebrow">YOU CONTROL THE BOUNDARY</span><h2>Keep the full workflow on your machine.</h2></div>
          <Link href="/setupwith">Install SetupWith locally <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
