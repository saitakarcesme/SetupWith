import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildGeneratedPrompt,
  getComplexity,
  getExperience,
  getInstallTime,
  getOfficialSource,
  getPlatforms,
  secretAlias,
  supportedPlatforms,
} from "../src/data/catalog-logic.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const baseCatalog = JSON.parse(await readFile(resolve(projectRoot, "src/data/chatgpt-catalog.json"), "utf8"));
const additions = JSON.parse(await readFile(resolve(projectRoot, "src/data/catalog-additions.json"), "utf8"));
const consumerCatalog = JSON.parse(await readFile(resolve(projectRoot, "src/data/consumer-catalog.json"), "utf8"));
const catalog = [...baseCatalog, ...additions, ...consumerCatalog];
const prompts = JSON.parse(await readFile(resolve(projectRoot, "src/data/app-prompts.json"), "utf8"));
const bundles = JSON.parse(await readFile(resolve(projectRoot, "src/data/setup-bundles.json"), "utf8"));
const logoManifest = JSON.parse(await readFile(resolve(projectRoot, "public/app-logos/manifest.json"), "utf8"));

const categories = new Set([
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
]);
const experiences = new Set(["software", "ai", "gaming", "entertainment", "work", "creative", "social", "browsers", "hardware"]);
const sourceTypes = new Set(["github", "website", "app-store", "microsoft-store"]);
const deliveryMethods = new Set(["native", "store", "package-manager", "pwa"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validatePrompt(prompt, slug, minWords = 120) {
  assert(typeof prompt === "string", `Missing prompt for ${slug}`);
  const words = prompt.trim().split(/\s+/).length;
  assert(words >= minWords && words <= 520, `Prompt length for ${slug} is ${words} words`);
  assert(/verify|verification|confirm|health check/i.test(prompt), `Prompt lacks verification for ${slug}`);
  assert(/rollback|uninstall|restore|roll back/i.test(prompt), `Prompt lacks rollback for ${slug}`);
  assert(!/(?:sk|ghp|github_pat)-?[A-Za-z0-9_]{20,}/.test(prompt), `Possible secret value in ${slug}`);
}

const unsafeSvgPatterns = [
  [/<\!doctype/i, "DOCTYPE declaration"],
  [/<(?:script|foreignObject|iframe|object|embed)\b/i, "executable or embedded element"],
  [/\son[a-z]+\s*=/i, "inline event handler"],
  [/javascript\s*:/i, "javascript URL"],
  [/@import\b/i, "external stylesheet import"],
  [/(?:xlink:)?href\s*=\s*["']\s*(?:https?:)?\/\//i, "remote href"],
  [/url\(\s*["']?\s*(?:https?:)?\/\//i, "remote CSS URL"],
];

assert(Array.isArray(catalog), "Catalog must be an array");
assert(baseCatalog.length === 100, `Base catalog must contain 100 entries; received ${baseCatalog.length}`);
assert(additions.length === 100, `Expansion must contain 100 entries; received ${additions.length}`);
assert(consumerCatalog.length === 100, `Consumer expansion must contain 100 entries; received ${consumerCatalog.length}`);
assert(catalog.length === baseCatalog.length + additions.length + consumerCatalog.length, `Catalog length mismatch: ${catalog.length}`);

const slugs = new Set();
const names = new Set();

for (const [position, app] of catalog.entries()) {
  assert(app.index === position + 1, `Invalid index for ${app.slug ?? position}`);
  assert(typeof app.name === "string" && app.name.length > 1, `Missing name at index ${app.index}`);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(app.slug), `Invalid slug: ${app.slug}`);
  assert(!slugs.has(app.slug), `Duplicate slug: ${app.slug}`);
  assert(!names.has(app.name.toLowerCase()), `Duplicate name: ${app.name}`);
  const source = getOfficialSource(app);
  assert(sourceTypes.has(source.type), `Invalid official source type for ${app.slug}: ${source.type}`);
  assert(/^https:\/\//.test(source.url), `Invalid official source URL for ${app.slug}: ${source.url}`);
  if (source.installUrl) assert(/^https:\/\//.test(source.installUrl), `Invalid install URL for ${app.slug}`);
  if (source.type === "github") {
    assert(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(source.url), `Invalid GitHub source: ${source.url}`);
  }
  assert(/^https:\/\//.test(app.website), `Invalid website: ${app.website}`);
  assert(/^#[0-9A-Fa-f]{6}$/.test(app.accent), `Invalid accent for ${app.slug}`);
  assert(categories.has(app.category), `Invalid category for ${app.slug}: ${app.category}`);
  assert(experiences.has(getExperience(app)), `Invalid experience for ${app.slug}: ${getExperience(app)}`);
  assert(Array.isArray(app.secrets) && Array.isArray(app.config), `Invalid context schema for ${app.slug}`);
  if (app.platforms) {
    assert(app.platforms.length > 0, `Empty platform list for ${app.slug}`);
    assert(app.platforms.every((platform) => supportedPlatforms.includes(platform)), `Invalid platform for ${app.slug}`);
  }
  if (app.delivery) assert(deliveryMethods.has(app.delivery), `Invalid delivery method for ${app.slug}`);
  if (app.index > 200) {
    assert(typeof app.vertical === "string", `Consumer app ${app.slug} must declare a vertical`);
    assert(typeof app.delivery === "string", `Consumer app ${app.slug} must declare a delivery method`);
    for (const key of ["requiresSignIn", "requiresElevation", "mayInstallDrivers", "mayInstallKernelComponents", "mayRequireRestart"]) {
      assert(typeof app[key] === "boolean", `Consumer app ${app.slug} must declare ${key}`);
    }
  }
  if (!prompts[app.slug]) {
    assert(app.setup && typeof app.setup === "object", `Missing structured setup guidance for ${app.slug}`);
    for (const key of ["install", "preserve", "safety", "verify"]) {
      assert(typeof app.setup[key] === "string" && app.setup[key].length >= 40, `Incomplete ${key} guidance for ${app.slug}`);
    }
  }

  const prompt = prompts[app.slug] ?? buildGeneratedPrompt(app);
  validatePrompt(prompt, app.slug);

  const manifestEntry = logoManifest[app.slug];
  assert(manifestEntry?.file === `${app.slug}.svg`, `Missing logo manifest entry for ${app.slug}`);
  assert(/^https:\/\//.test(manifestEntry.source), `Logo source is not attributed for ${app.slug}`);
  assert(
    ["official-project-asset", "simple-icons-official-glyph"].includes(manifestEntry.sourceType),
    `Invalid logo source type for ${app.slug}`,
  );
  const logoPath = resolve(projectRoot, "public/app-logos", manifestEntry.file);
  const logoStat = await stat(logoPath);
  assert(logoStat.size > 80, `Empty logo file for ${app.slug}`);
  const logo = await readFile(logoPath, "utf8");
  assert(/<svg[\s>]/i.test(logo), `Logo is not SVG for ${app.slug}`);
  for (const [pattern, description] of unsafeSvgPatterns) {
    assert(!pattern.test(logo), `Logo contains unsafe ${description} for ${app.slug}`);
  }

  const contentDirectory = resolve(projectRoot, "content/apps", app.slug);
  const identity = JSON.parse(await readFile(resolve(contentDirectory, "identity.json"), "utf8"));
  const context = JSON.parse(await readFile(resolve(contentDirectory, "context.json"), "utf8"));
  const promptArtifact = await readFile(resolve(contentDirectory, "prompt.md"), "utf8");
  assert(identity.slug === app.slug && identity.index === app.index, `Stale identity artifact for ${app.slug}`);
  assert(JSON.stringify(identity.source) === JSON.stringify(source), `Stale source artifact for ${app.slug}`);
  assert(identity.vertical === getExperience(app), `Stale vertical artifact for ${app.slug}`);
  assert(JSON.stringify(context.platforms) === JSON.stringify(getPlatforms(app)), `Stale platforms artifact for ${app.slug}`);
  assert(context.installTime === getInstallTime(app), `Stale install-time artifact for ${app.slug}`);
  assert(context.complexity === getComplexity(app), `Stale complexity artifact for ${app.slug}`);
  assert(
    JSON.stringify(context.secrets) === JSON.stringify(app.secrets.map((key) => ({ key, reference: secretAlias(key) }))),
    `Stale secret-reference artifact for ${app.slug}`,
  );
  assert(promptArtifact === `# ${app.name} setup prompt\n\n${prompt}\n`, `Stale prompt artifact for ${app.slug}`);

  slugs.add(app.slug);
  names.add(app.name.toLowerCase());
}

assert(Object.keys(prompts).length === 100, `Tailored prompt map must contain 100 prompts; received ${Object.keys(prompts).length}`);
assert(Object.keys(logoManifest).length === catalog.length, `Logo manifest must contain ${catalog.length} entries; received ${Object.keys(logoManifest).length}`);

const bundleSlugs = new Set();
for (const [position, bundle] of bundles.entries()) {
  assert(bundle.index === position + 1, `Invalid bundle index for ${bundle.slug}`);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(bundle.slug), `Invalid bundle slug: ${bundle.slug}`);
  assert(!bundleSlugs.has(bundle.slug), `Duplicate bundle slug: ${bundle.slug}`);
  assert(Array.isArray(bundle.appSlugs) && bundle.appSlugs.length >= 4, `Bundle ${bundle.slug} needs at least four apps`);
  assert(bundle.appSlugs.every((slug) => slugs.has(slug)), `Bundle ${bundle.slug} references an unknown app`);
  assert(bundle.platforms.every((platform) => supportedPlatforms.includes(platform)), `Invalid platform in bundle ${bundle.slug}`);
  assert(/^#[0-9A-Fa-f]{6}$/.test(bundle.accent), `Invalid accent for bundle ${bundle.slug}`);
  if (bundle.vertical) assert(experiences.has(bundle.vertical), `Invalid vertical in bundle ${bundle.slug}`);
  validatePrompt(bundle.prompt, `bundle:${bundle.slug}`, 160);
  bundleSlugs.add(bundle.slug);
}

assert(bundles.length >= 6, `Expected at least 6 setup bundles; received ${bundles.length}`);

console.log(
  `Validated ${catalog.length} apps, ${bundles.length} bundles, ${slugs.size} unique slugs, ` +
    `${Object.keys(prompts).length} tailored prompts, and ${Object.keys(logoManifest).length} local logos.`,
);
