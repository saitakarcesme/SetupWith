import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { PackageBuilder } from "@/components/package-builder";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TypingHeadline } from "@/components/typing-headline";
import { apps } from "@/data/apps";
import { isAuthConfigured } from "@/lib/auth-config";
import { toPackageAppSummary } from "@/lib/custom-packages";

export const metadata: Metadata = {
  title: "Package builder",
  description: "Select multiple apps and turn them into one coordinated, safety-aware Codex setup prompt.",
};

export default async function NewPackagePage() {
  const authConfigured = isAuthConfigured();
  const signedIn = authConfigured ? (await auth()).isAuthenticated : false;

  return (
    <>
      <SiteHeader />
      <main className="package-page">
        <section className="package-hero shell">
          <span className="eyebrow">PACKAGE BUILDER / ONE COORDINATED RUN</span>
          <TypingHeadline>Choose together.<br /><span>Set up once.</span></TypingHeadline>
          <p>
            Combine applications into a named setup package. SetupWith creates one dependency-aware prompt,
            keeps the official sources, and preserves every approval boundary.
          </p>
        </section>
        <section className="shell package-page-body">
          <PackageBuilder
            apps={apps.map(toPackageAppSummary)}
            authConfigured={authConfigured}
            signedIn={signedIn}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
