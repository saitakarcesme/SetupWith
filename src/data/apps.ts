import catalog from "./chatgpt-catalog.json";
import promptMap from "./app-prompts.json";

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
] as const;

export type AppCategory = Exclude<(typeof categories)[number], "All">;

export interface CatalogEntry {
  index: number;
  name: string;
  slug: string;
  repo: string;
  website: string;
  category: AppCategory;
  description: string;
  accent: string;
  simpleIconSlug: string | null;
  secrets: string[];
  config: string[];
}

export interface SetupApp extends CatalogEntry {
  prompt: string;
  platforms: readonly string[];
  installTime: string;
  complexity: "Simple" | "Guided" | "Advanced";
  pattern: number;
}

const platformOverrides: Record<string, readonly string[]> = {
  homebrew: ["macOS", "Linux"],
  rufus: ["Windows"],
  iterm2: ["macOS"],
  rectangle: ["macOS"],
  raycast: ["macOS"],
  winget: ["Windows"],
  wsl: ["Windows"],
  chocolatey: ["Windows"],
  powertoys: ["Windows"],
  utm: ["macOS"],
  alacritty: ["macOS", "Linux", "Windows"],
};

const prompts = promptMap as Record<string, string>;

const logoOverrides: Record<string, string> = {
  "visual-studio-code":
    "https://raw.githubusercontent.com/microsoft/vscode/main/resources/linux/code.png",
};

function defaultPrompt(app: CatalogEntry): string {
  const secretRefs = app.secrets.length
    ? app.secrets.map((secret) => secretAlias(secret)).join(", ")
    : "none";
  const preferences = app.config.length ? app.config.join(", ") : "none";

  return `Set up ${app.name} from its verified source (${app.repo}). First inspect this machine's operating system, architecture, shell, package managers, and any existing ${app.name} installation. Preserve current configuration and explain the safest native installation path before making changes. Use only official packages or releases.\n\nApply these profile preferences when they are available: ${preferences}. Available secret references: ${secretRefs}. Treat every secret:// reference as opaque: never print, echo, log, or paste its value. Ask before administrator access, changing services, opening ports, modifying firewall rules, browser sign-in, or overwriting files.\n\nConfigure ${app.name} for a practical local workflow, then verify the actual executable, service, desktop application, or web endpoint as appropriate. Report installed paths and changed files without exposing sensitive values. If a step is unsupported on this platform, stop and offer the closest official alternative. End with verification results, any manual actions still required, and exact rollback steps that preserve user data.`;
}

function getComplexity(entry: CatalogEntry): SetupApp["complexity"] {
  if (entry.category === "DevOps & Cloud" || entry.category === "Web & Self-hosted") {
    return "Advanced";
  }
  if (entry.secrets.length > 0 || entry.category === "Data & Databases") {
    return "Guided";
  }
  return "Simple";
}

export const apps: SetupApp[] = (catalog as CatalogEntry[]).map((entry) => ({
  ...entry,
  prompt: prompts[entry.slug] ?? defaultPrompt(entry),
  platforms: platformOverrides[entry.slug] ?? ["macOS", "Linux", "Windows"],
  installTime:
    entry.category === "Web & Self-hosted" || entry.category === "DevOps & Cloud"
      ? "10–20 min"
      : entry.secrets.length > 0
        ? "5–10 min"
        : "2–5 min",
  complexity: getComplexity(entry),
  pattern: (entry.index % 6) + 1,
}));

export function getApp(slug: string): SetupApp | undefined {
  return apps.find((app) => app.slug === slug);
}

export function getRelatedApps(app: SetupApp, limit = 3): SetupApp[] {
  return apps
    .filter((candidate) => candidate.category === app.category && candidate.slug !== app.slug)
    .slice(0, limit);
}

export function getLogoUrl(app: CatalogEntry): string {
  if (logoOverrides[app.slug]) {
    return logoOverrides[app.slug];
  }

  if (app.simpleIconSlug) {
    return `https://cdn.simpleicons.org/${app.simpleIconSlug}/${app.accent.replace("#", "")}`;
  }

  const owner = new URL(app.repo).pathname.split("/").filter(Boolean)[0];
  return `https://github.com/${owner}.png?size=160`;
}

export function secretAlias(secret: string): string {
  const parts = secret.toLowerCase().split("_");
  const provider = parts[0] || "private";
  const key = parts.slice(1).join("-") || "credential";
  return `secret://${provider}/${key}`;
}

export function humanizeKey(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
