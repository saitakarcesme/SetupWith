import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Fingerprint, HardDrive, ShieldCheck } from "lucide-react";
import { EnvironmentProfile } from "@/components/environment-profile";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { VaultPanel } from "@/components/vault-panel";

export const metadata: Metadata = {
  title: "Context profile",
  description: "Create a reusable local environment profile and encrypted secret alias vault for SetupWith.",
};

export default function ProfilePage() {
  return (
    <>
      <SiteHeader />
      <main className="profile-page">
        <section className="profile-hero shell">
          <span className="eyebrow">YOUR CONTEXT / LOCAL FIRST</span>
          <h1>Brief Codex once.<br /><span>Reuse it everywhere.</span></h1>
          <p>
            Store ordinary preferences as local context and protect credentials in an encrypted browser vault.
            App pages only request the fields they genuinely need.
          </p>
          <div className="profile-trust-row">
            <span><HardDrive size={15} aria-hidden="true" /> Stored on this device</span>
            <span><Fingerprint size={15} aria-hidden="true" /> Passphrase-derived key</span>
            <span><ShieldCheck size={15} aria-hidden="true" /> Secret aliases in prompts</span>
          </div>
        </section>
        <section className="shell profile-stack">
          <EnvironmentProfile />
          <div className="vault-wrap">
            <VaultPanel />
          </div>
        </section>
        <section className="profile-next shell">
          <div><span>01</span><p>Save environment defaults</p></div>
          <div><span>02</span><p>Add only credentials you choose</p></div>
          <div><span>03</span><p>Open an app and copy its tailored prompt</p></div>
          <Link href="/apps">Choose an app <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
