import additions from "./catalog-additions.json";
import baseCatalog from "./chatgpt-catalog.json";
import consumerCatalog from "./consumer-catalog.json";
import firstPartyCatalog from "./first-party-catalog.json";
import professionalCatalog from "./professional-catalog.mjs";
import {
  buildGeneratedPrompt,
  getComplexity,
  getInstallTime,
  getPlatforms,
  secretAlias,
} from "./catalog-logic.mjs";
import promptMap from "./app-prompts.json";
import bundleCatalog from "./setup-bundles.json";

export const categories = [
  "All",
  "Developer Tools",
  "AI & ML",
  "Data & Databases",
  "DevOps & Cloud",
  "Productivity",
  "Design & Media",
  "Security & Privacy",
  "Communication",
  "Web & Self-hosted",
  "System Utilities",
  "Games & Launchers",
  "Music & Streaming",
  "Work & Cloud",
  "Creative Studio",
  "Social & Communication",
  "Browsers & Internet",
  "Devices & Hardware",
  "AI Assistants & Coding Agents",
  "Professional IDEs & Mobile SDKs",
  "API, Networking & Database Clients",
  "Cloud Provider & Deployment CLIs",
  "Office, Notes & Team Collaboration",
  "Cloud Storage, Backup & File Transfer",
  "Remote Access, Virtualization & Containers",
  "Professional Creative Suites",
  "Audio, Podcast & Streaming Production",
  "Science, Engineering & Research",
  "Consumer Security, VPN & Identity",
  "OS Utilities & Desktop Enhancement",
  "Device Management & OEM Utilities",
  "Streaming, Reading & Consumer Media",
  "Business Intelligence & Enterprise Apps",
] as const;

export type AppCategory = Exclude<(typeof categories)[number], "All">;
export type SupportedPlatform = "macOS" | "Linux" | "Windows" | "Web";

export const experiences = [
  { id: "all", label: "All" },
  { id: "software", label: "Software" },
  { id: "ai", label: "AI Lab" },
  { id: "gaming", label: "Gaming" },
  { id: "entertainment", label: "Entertainment" },
  { id: "work", label: "Work" },
  { id: "creative", label: "Creative" },
  { id: "social", label: "Social" },
  { id: "browsers", label: "Browsers" },
  { id: "hardware", label: "Hardware" },
] as const;

export type CatalogExperience = Exclude<(typeof experiences)[number]["id"], "all">;
export type CatalogExperienceFilter = (typeof experiences)[number]["id"];
export type DeliveryMethod = "native" | "store" | "package-manager" | "pwa" | "source";
export type OfficialSourceType = "github" | "website" | "app-store" | "microsoft-store";

export interface OfficialSource {
  type: OfficialSourceType;
  url: string;
  installUrl?: string;
}

export const bundleCategories = ["Local AI", "Coding", "Data", "DevOps", "Creative", "Productivity", "Gaming", "Entertainment"] as const;
export type BundleCategory = (typeof bundleCategories)[number];

export interface PromptSetup {
  install: string;
  preserve: string;
  safety: string;
  verify: string;
}

export interface CatalogEntry {
  index: number;
  name: string;
  slug: string;
  repo?: string;
  source?: OfficialSource;
  website: string;
  category: AppCategory;
  vertical?: CatalogExperience;
  description: string;
  accent: string;
  simpleIconSlug: string | null;
  logoUrl?: string;
  logoSourceType?: "official-project-asset" | "curated-brand-asset";
  secrets: string[];
  config: string[];
  platforms?: readonly SupportedPlatform[];
  delivery?: DeliveryMethod;
  requiresSignIn?: boolean;
  requiresElevation?: boolean;
  mayInstallDrivers?: boolean;
  mayInstallKernelComponents?: boolean;
  mayRequireRestart?: boolean;
  setup?: PromptSetup;
}

export interface SetupApp extends CatalogEntry {
  prompt: string;
  platforms: readonly SupportedPlatform[];
  installTime: string;
  complexity: "Simple" | "Guided" | "Advanced";
  pattern: number;
  vertical: CatalogExperience;
  source: OfficialSource;
}

export interface SetupBundle {
  index: number;
  name: string;
  slug: string;
  category: BundleCategory;
  description: string;
  accent: string;
  appSlugs: string[];
  platforms: readonly SupportedPlatform[];
  installTime: string;
  complexity: "Guided" | "Advanced";
  prompt: string;
  vertical?: CatalogExperience;
}

const prompts = promptMap as Record<string, string>;
const catalog = [
  ...baseCatalog,
  ...additions,
  ...consumerCatalog,
  ...firstPartyCatalog,
  ...professionalCatalog,
] as CatalogEntry[];

export function getExperience(entry: CatalogEntry): CatalogExperience {
  if (entry.vertical) return entry.vertical;
  if (entry.category === "AI & ML") return "ai";
  if (entry.category === "Design & Media") return "creative";
  if (entry.category === "Productivity") return "work";
  if (entry.category === "Communication") return "social";
  return "software";
}

export function getOfficialSource(entry: CatalogEntry): OfficialSource {
  if (entry.source) return entry.source;
  if (!entry.repo) throw new Error(`Missing official source for ${entry.slug}`);
  return { type: "github", url: entry.repo };
}

export function getSourceLabel(entry: CatalogEntry): string {
  const source = getOfficialSource(entry);
  if (source.type === "github") return "Official repository";
  if (source.type === "app-store") return "Apple App Store";
  if (source.type === "microsoft-store") return "Microsoft Store";
  if (source.installUrl) return "Official download";
  return "Official source";
}

export const apps: SetupApp[] = catalog.map((entry) => ({
  ...entry,
  source: getOfficialSource(entry),
  vertical: getExperience(entry),
  prompt: prompts[entry.slug] ?? buildGeneratedPrompt(entry),
  platforms: getPlatforms(entry) as readonly SupportedPlatform[],
  installTime: getInstallTime(entry),
  complexity: getComplexity(entry),
  pattern: (entry.index % 6) + 1,
}));

export const bundles = bundleCatalog as SetupBundle[];

export function getApp(slug: string): SetupApp | undefined {
  return apps.find((app) => app.slug === slug);
}

export function getRelatedApps(app: SetupApp, limit = 3): SetupApp[] {
  return apps
    .filter((candidate) => candidate.vertical === app.vertical && candidate.slug !== app.slug)
    .sort((left, right) => Number(right.category === app.category) - Number(left.category === app.category))
    .slice(0, limit);
}

export function getBundleApps(bundle: SetupBundle): SetupApp[] {
  return bundle.appSlugs
    .map((slug) => getApp(slug))
    .filter((app): app is SetupApp => Boolean(app));
}

export function getLogoUrl(app: CatalogEntry): string {
  return `/app-logos/${app.slug}.svg`;
}

export { secretAlias };

export function humanizeKey(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
