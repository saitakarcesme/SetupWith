import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, LockKeyhole, Plus } from "lucide-react";
import { PackageLibrary, type PackageLibraryItem } from "@/components/package-library";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TypingHeadline } from "@/components/typing-headline";
import { apps } from "@/data/apps";
import { isAuthConfigured } from "@/lib/auth-config";
import { composePackagePrompt, toPackageAppSummary } from "@/lib/custom-packages";
import { getUserPackages } from "@/lib/package-store";

export const metadata: Metadata = {
  title: "Account packages",
  description: "Your private library of named SetupWith app packages.",
};

export default async function AccountPage() {
  const authConfigured = isAuthConfigured();

  if (!authConfigured) {
    return (
      <>
        <SiteHeader />
        <main className="account-page shell">
          <section className="account-unavailable">
            <LockKeyhole aria-hidden="true" size={26} />
            <span className="eyebrow">ACCOUNT SERVICE</span>
            <h1>Accounts are not configured.</h1>
            <p>The public catalog and common package prompt builder are still fully available.</p>
            <Link href="/packages/new">Build a package <ArrowRight aria-hidden="true" size={16} /></Link>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  const { isAuthenticated, redirectToSignIn, userId } = await auth();
  if (!isAuthenticated || !userId) return redirectToSignIn({ returnBackUrl: "/account" });

  const storedPackages = await getUserPackages(userId);
  const appBySlug = new Map(apps.map((app) => [app.slug, app]));
  const libraryItems: PackageLibraryItem[] = storedPackages.map((item) => {
    const selectedApps = item.appSlugs
      .map((slug) => appBySlug.get(slug))
      .filter((app) => Boolean(app))
      .map((app) => toPackageAppSummary(app!));
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      appNames: selectedApps.map((app) => app.name),
      prompt: composePackagePrompt(item, selectedApps),
      updatedAt: item.updatedAt,
    };
  });

  return (
    <>
      <SiteHeader />
      <main className="account-page">
        <section className="account-hero shell">
          <div>
            <span className="eyebrow">ACCOUNT / PRIVATE LIBRARY</span>
            <TypingHeadline>Your setup packages.</TypingHeadline>
            <p>Name a group of apps once, then reuse one coordinated prompt whenever you need the workspace again.</p>
          </div>
          <Link href="/packages/new"><Plus aria-hidden="true" size={16} /> New package</Link>
        </section>
        <section className="shell account-library">
          <PackageLibrary items={libraryItems} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
