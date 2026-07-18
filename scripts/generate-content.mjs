import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildGeneratedPrompt,
  getComplexity,
  getExperience,
  getInstallTime,
  getOfficialSource,
  getPlatforms,
  secretAlias,
} from "../src/data/catalog-logic.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const baseCatalog = JSON.parse(await readFile(resolve(projectRoot, "src/data/chatgpt-catalog.json"), "utf8"));
const additions = JSON.parse(await readFile(resolve(projectRoot, "src/data/catalog-additions.json"), "utf8"));
const consumerCatalog = JSON.parse(await readFile(resolve(projectRoot, "src/data/consumer-catalog.json"), "utf8"));
const firstPartyCatalog = JSON.parse(await readFile(resolve(projectRoot, "src/data/first-party-catalog.json"), "utf8"));
const catalog = [...baseCatalog, ...additions, ...consumerCatalog, ...firstPartyCatalog];
const prompts = JSON.parse(await readFile(resolve(projectRoot, "src/data/app-prompts.json"), "utf8"));
const startIndex = Number.parseInt(process.env.CATALOG_START_INDEX ?? "1", 10);
const selectedCatalog = catalog.filter((app) => app.index >= startIndex);

async function writeIfChanged(path, content) {
  try {
    const existing = await readFile(path, "utf8");
    if (existing.replace(/\r\n?/g, "\n") === content.replace(/\r\n?/g, "\n")) return false;
  } catch (error) {
    // Desktop repositories can be offloaded by iCloud. Treat a transient read
    // failure like a missing generated artifact and recreate it from source.
    if (!["ENOENT", "ETIMEDOUT", "EIO"].includes(error?.code)) throw error;
  }
  await writeFile(path, content, "utf8");
  return true;
}

let changedFiles = 0;

for (const app of selectedCatalog) {
  const directory = resolve(projectRoot, "content/apps", app.slug);
  await mkdir(directory, { recursive: true });

  const identity = {
    index: app.index,
    name: app.name,
    slug: app.slug,
    source: getOfficialSource(app),
    website: app.website,
    category: app.category,
    vertical: getExperience(app),
    description: app.description,
    accent: app.accent,
    simpleIconSlug: app.simpleIconSlug,
  };
  const context = {
    platforms: getPlatforms(app),
    installTime: getInstallTime(app),
    complexity: getComplexity(app),
    delivery: app.delivery ?? "package-manager",
    safety: {
      requiresSignIn: Boolean(app.requiresSignIn),
      requiresElevation: Boolean(app.requiresElevation),
      mayInstallDrivers: Boolean(app.mayInstallDrivers),
      mayInstallKernelComponents: Boolean(app.mayInstallKernelComponents),
      mayRequireRestart: Boolean(app.mayRequireRestart),
    },
    preferences: app.config,
    secrets: app.secrets.map((key) => ({ key, reference: secretAlias(key) })),
    permissionCheckpoints: [
      "administrator access",
      "configuration overwrite",
      "service or daemon changes",
      "ports and firewall rules",
      "browser sign-in",
      "account creation, MFA, CAPTCHA, age verification, or paid subscription",
      "large downloads and destination storage",
      "drivers, anti-cheat, kernel components, or restart",
    ],
  };

  changedFiles += Number(await writeIfChanged(resolve(directory, "identity.json"), `${JSON.stringify(identity, null, 2)}\n`));
  changedFiles += Number(await writeIfChanged(resolve(directory, "context.json"), `${JSON.stringify(context, null, 2)}\n`));
  const prompt = prompts[app.slug] ?? buildGeneratedPrompt(app);
  changedFiles += Number(await writeIfChanged(resolve(directory, "prompt.md"), `# ${app.name} setup prompt\n\n${prompt}\n`));
}

console.log(`Verified ${selectedCatalog.length * 3} auditable content files for ${selectedCatalog.length} selected apps; wrote ${changedFiles} changed files.`);
