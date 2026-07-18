import type { Metadata } from "next";
import { CatalogPageShell } from "@/components/catalog-page-shell";
import { apps, bundles } from "@/data/apps";

export const metadata: Metadata = {
  title: "App catalog",
  description: "Browse product-specific software, AI, gaming, entertainment, work, and device setup prompts for Codex.",
};

interface AppsPageProps {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[]; experience?: string | string[] }>;
}

export default async function AppsPage({ searchParams }: AppsPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "All";
  const experience = typeof params.experience === "string" ? params.experience : "all";

  return (
    <CatalogPageShell
      apps={apps}
      bundles={bundles}
      initialQuery={query}
      initialCategory={category}
      initialExperience={experience}
    />
  );
}
