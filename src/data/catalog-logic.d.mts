export const supportedPlatforms: readonly ["macOS", "Linux", "Windows", "Web"];

export interface OfficialSource {
  type: "github" | "website" | "app-store" | "microsoft-store";
  url: string;
  installUrl?: string;
}

export interface PromptSetup {
  install: string;
  preserve: string;
  safety: string;
  verify: string;
}

export interface CatalogLogicEntry {
  name: string;
  slug: string;
  repo?: string;
  source?: OfficialSource;
  category: string;
  vertical?: string;
  secrets: string[];
  config: string[];
  platforms?: readonly string[];
  delivery?: string;
  mayInstallDrivers?: boolean;
  mayInstallKernelComponents?: boolean;
  mayRequireRestart?: boolean;
  setup?: PromptSetup;
}

export function secretAlias(secret: string): string;
export function getPlatforms(app: CatalogLogicEntry): readonly string[];
export function getExperience(app: CatalogLogicEntry): string;
export function getOfficialSource(app: CatalogLogicEntry): OfficialSource;
export function getComplexity(app: CatalogLogicEntry): "Simple" | "Guided" | "Advanced";
export function getInstallTime(app: CatalogLogicEntry): string;
export function buildGeneratedPrompt(app: CatalogLogicEntry): string;
