import { z } from "zod";
import type { SetupApp } from "@/data/apps";

export const MAX_SAVED_PACKAGES = 6;
export const MAX_PACKAGE_APPS = 8;
export const PACKAGE_LIBRARY_BYTE_BUDGET = 6_000;

export interface PackageAppSummary {
  slug: string;
  name: string;
  category: string;
  description: string;
  accent: string;
  simpleIconSlug: string | null;
  platforms: readonly string[];
  sourceUrl: string;
  installUrl?: string;
  delivery?: string;
  requiresSignIn: boolean;
  requiresElevation: boolean;
  mayInstallDrivers: boolean;
  mayInstallKernelComponents: boolean;
  mayRequireRestart: boolean;
  secretAliases: string[];
  setup?: {
    install: string;
    preserve: string;
    safety: string;
    verify: string;
  };
}

export interface StoredPackage {
  id: string;
  name: string;
  description: string;
  instruction: string;
  appSlugs: string[];
  createdAt: string;
  updatedAt: string;
}

const secretPatterns = [
  /(?:sk-(?:live|test)-[A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9_-]{16,})/i,
  /gh[pousr]_[A-Za-z0-9]{20,}/i,
  /xox[baprs]-[A-Za-z0-9-]{16,}/i,
  /AKIA[A-Z0-9]{16}/,
  /AIza[0-9A-Za-z_-]{30,}/,
  /Bearer\s+[A-Za-z0-9._~-]{16,}/i,
  /eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqps?):\/\/[^\s/:@]+:[^\s@]+@/i,
  /(?:password|passwd|pwd|api[_ -]?key|client[_ -]?secret|access[_ -]?token|auth[_ -]?token)\s*[:=]\s*["']?[^\s"']{8,}/i,
] as const;

export function containsLikelySecret(value: string): boolean {
  return secretPatterns.some((pattern) => pattern.test(value));
}

export const packageInputSchema = z.object({
  name: z.string().trim().min(1, "Give this package a name.").max(60, "Use 60 characters or fewer."),
  description: z.string().trim().max(160, "Use 160 characters or fewer."),
  instruction: z.string().trim().max(480, "Use 480 characters or fewer."),
  appSlugs: z.array(z.string().trim().min(1)).min(2, "Select at least two apps.").max(
    MAX_PACKAGE_APPS,
    `Select up to ${MAX_PACKAGE_APPS} apps.`,
  ),
}).superRefine((value, context) => {
  if (new Set(value.appSlugs).size !== value.appSlugs.length) {
    context.addIssue({ code: "custom", path: ["appSlugs"], message: "Each app can only be selected once." });
  }
  if (containsLikelySecret(value.description) || containsLikelySecret(value.instruction)) {
    context.addIssue({
      code: "custom",
      path: ["instruction"],
      message: "Do not place API keys, tokens, or private keys in a package instruction.",
    });
  }
});

export type PackageInput = z.infer<typeof packageInputSchema>;

export function toPackageAppSummary(app: SetupApp): PackageAppSummary {
  return {
    slug: app.slug,
    name: app.name,
    category: app.category,
    description: app.description,
    accent: app.accent,
    simpleIconSlug: app.simpleIconSlug,
    platforms: app.platforms,
    sourceUrl: app.source.url,
    installUrl: app.source.installUrl,
    delivery: app.delivery,
    requiresSignIn: Boolean(app.requiresSignIn),
    requiresElevation: Boolean(app.requiresElevation),
    mayInstallDrivers: Boolean(app.mayInstallDrivers),
    mayInstallKernelComponents: Boolean(app.mayInstallKernelComponents),
    mayRequireRestart: Boolean(app.mayRequireRestart),
    secretAliases: app.secrets.map((secret) => `secret://${app.slug}/${secret.toLowerCase()}`),
    setup: app.setup,
  };
}

export function composePackagePrompt(
  input: Pick<PackageInput, "name" | "description" | "instruction">,
  selectedApps: readonly PackageAppSummary[],
): string {
  const appSections = selectedApps.map((app, index) => {
    const approvals = [
      app.requiresSignIn ? "account sign-in" : null,
      app.requiresElevation ? "administrator elevation" : null,
      app.mayInstallDrivers ? "driver installation" : null,
      app.mayInstallKernelComponents ? "kernel or system extension changes" : null,
      app.mayRequireRestart ? "restart" : null,
    ].filter(Boolean);
    const officialSource = app.installUrl ?? app.sourceUrl;

    return [
      `### ${index + 1}. ${app.name}`,
      `- Official source: ${officialSource}`,
      `- Supported targets: ${app.platforms.join(", ")}`,
      `- Delivery: ${app.delivery ?? "choose the official installer appropriate for this machine"}`,
      `- Install objective: ${app.setup?.install ?? `Install or prepare ${app.name} from its official source.`}`,
      `- Preserve: ${app.setup?.preserve ?? "Keep existing accounts, profiles, projects, and configuration intact."}`,
      `- Safety: ${app.setup?.safety ?? "Do not change defaults, permissions, or unrelated settings without approval."}`,
      `- Verify: ${app.setup?.verify ?? `Confirm ${app.name} launches or reports a valid installed version.`}`,
      approvals.length > 0
        ? `- Mandatory handoff before: ${approvals.join(", ")}.`
        : "- Mandatory handoff before any login, purchase, subscription, or destructive action.",
      app.secretAliases.length > 0
        ? `- Secret references allowed in prompts: ${app.secretAliases.join(", ")}. Never reveal their values.`
        : null,
    ].filter(Boolean).join("\n");
  });

  return [
    `# Setup package: ${input.name || "Untitled setup"}`,
    input.description ? `Outcome: ${input.description}` : null,
    input.instruction ? `Shared instruction: ${input.instruction}` : null,
    "",
    "You are preparing one coordinated setup run. Work locally, use only official sources listed below, and inspect the machine before changing it.",
    "",
    "## Shared preflight",
    "1. Detect the operating system, architecture, available storage, package managers, and existing installations.",
    "2. Reuse healthy existing installations and configuration. Do not reinstall, downgrade, reset, or overwrite them unnecessarily.",
    "3. Plan one dependency-aware install order and deduplicate shared runtimes, launchers, and services.",
    "4. Explain the plan before execution. Keep each application independently reversible.",
    "",
    "## Applications",
    ...appSections,
    "",
    "## Non-negotiable safety boundary",
    "Stop and ask for explicit approval before sign-in, MFA, CAPTCHA, payments, purchases, subscriptions, license acceptance, administrator elevation, drivers, kernel extensions, firewall changes, changing defaults, deleting data, or restarting the machine. Never request or print raw secrets; use only prompt-safe secret:// references.",
    "",
    "## Finish",
    "Verify every application separately, report installed/reused/skipped/blocked status, list exact official sources used, note any remaining human handoffs, and include rollback instructions for each change. A partial success must be reported as partial—not complete.",
  ].filter((line): line is string => line !== null).join("\n");
}

export function parseStoredPackages(value: unknown): StoredPackage[] {
  if (!value || typeof value !== "object") return [];
  const container = value as { items?: unknown };
  if (!Array.isArray(container.items)) return [];

  return container.items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<StoredPackage>;
    if (
      typeof candidate.id !== "string"
      || typeof candidate.name !== "string"
      || !Array.isArray(candidate.appSlugs)
      || !candidate.appSlugs.every((slug) => typeof slug === "string")
    ) return [];

    return [{
      id: candidate.id,
      name: candidate.name.slice(0, 60),
      description: typeof candidate.description === "string" ? candidate.description.slice(0, 160) : "",
      instruction: typeof candidate.instruction === "string" ? candidate.instruction.slice(0, 480) : "",
      appSlugs: [...new Set(candidate.appSlugs)].slice(0, MAX_PACKAGE_APPS),
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date(0).toISOString(),
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date(0).toISOString(),
    }];
  }).slice(0, MAX_SAVED_PACKAGES);
}
