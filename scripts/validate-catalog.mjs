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
const contentStartIndex = Number.parseInt(process.env.CATALOG_START_INDEX ?? "1", 10);
const baseCatalog = JSON.parse(await readFile(resolve(projectRoot, "src/data/chatgpt-catalog.json"), "utf8"));
const additions = JSON.parse(await readFile(resolve(projectRoot, "src/data/catalog-additions.json"), "utf8"));
const consumerCatalog = JSON.parse(await readFile(resolve(projectRoot, "src/data/consumer-catalog.json"), "utf8"));
const firstPartyCatalog = JSON.parse(await readFile(resolve(projectRoot, "src/data/first-party-catalog.json"), "utf8"));
const professionalCatalogOne = JSON.parse(await readFile(resolve(projectRoot, "src/data/professional-catalog-1.json"), "utf8"));
const professionalCatalogTwo = JSON.parse(await readFile(resolve(projectRoot, "src/data/professional-catalog-2.json"), "utf8"));
const professionalCatalogThree = JSON.parse(await readFile(resolve(projectRoot, "src/data/professional-catalog-3.json"), "utf8"));
const professionalCatalog = [...professionalCatalogOne, ...professionalCatalogTwo, ...professionalCatalogThree];
const openSourceCatalog = JSON.parse(await readFile(resolve(projectRoot, "src/data/open-source-catalog.json"), "utf8"));
const catalog = [
  ...baseCatalog,
  ...additions,
  ...consumerCatalog,
  ...firstPartyCatalog,
  ...professionalCatalogOne,
  ...professionalCatalogTwo,
  ...professionalCatalogThree,
];
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
]);
const experiences = new Set(["software", "ai", "gaming", "entertainment", "work", "creative", "social", "browsers", "hardware"]);
const sourceTypes = new Set(["github", "website", "app-store", "microsoft-store"]);
const deliveryMethods = new Set(["native", "store", "package-manager", "pwa", "source"]);

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

function normalizedWords(value) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
}

function jaccardSimilarity(left, right) {
  const intersection = [...left].filter((word) => right.has(word)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 1 : intersection / union;
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
assert(firstPartyCatalog.length === 1, `First-party catalog must contain SetupWith; received ${firstPartyCatalog.length}`);
assert(professionalCatalogOne.length === 40, `Professional catalog part one must contain 40 entries; received ${professionalCatalogOne.length}`);
assert(professionalCatalogTwo.length === 41, `Professional catalog part two must contain 41 entries; received ${professionalCatalogTwo.length}`);
assert(professionalCatalogThree.length === 104, `Professional catalog part three must contain 104 entries; received ${professionalCatalogThree.length}`);
assert(
  catalog.length === baseCatalog.length + additions.length + consumerCatalog.length + firstPartyCatalog.length +
    professionalCatalogOne.length + professionalCatalogTwo.length + professionalCatalogThree.length,
  `Catalog length mismatch: ${catalog.length}`,
);

const slugs = new Set();
const names = new Set();

for (const [position, app] of catalog.entries()) {
  assert(app.index === position + 1, `Invalid index for ${app.slug ?? position}`);
  assert(typeof app.name === "string" && app.name.length > 1, `Missing name at index ${app.index}`);
  assert(typeof app.description === "string" && app.description.length > 1, `Missing description for ${app.slug}`);
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
  if (app.logoUrl) {
    assert(/^https:\/\//.test(app.logoUrl), `Invalid logo URL for ${app.slug}`);
    assert(
      ["official-project-asset", "curated-brand-asset"].includes(app.logoSourceType ?? "official-project-asset"),
      `Invalid logo source type for ${app.slug}`,
    );
  }
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

  if (app.index >= 302) {
    assert(app.description.length >= 40, `Incomplete professional description for ${app.slug}`);
    for (const key of ["install", "preserve", "safety", "verify"]) {
      const words = app.setup[key].trim().split(/\s+/).length;
      assert(words >= 9, `${key} guidance for ${app.slug} is not product-specific enough (${words} words)`);
    }
  }

  const prompt = prompts[app.slug] ?? buildGeneratedPrompt(app);
  validatePrompt(prompt, app.slug);

  const manifestEntry = logoManifest[app.slug];
  assert(manifestEntry?.file === `${app.slug}.svg`, `Missing logo manifest entry for ${app.slug}`);
  assert(/^https:\/\//.test(manifestEntry.source), `Logo source is not attributed for ${app.slug}`);
  assert(
    ["official-project-asset", "curated-brand-asset", "simple-icons-official-glyph"].includes(manifestEntry.sourceType),
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

  if (app.index >= contentStartIndex) {
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
    assert(
      promptArtifact.replace(/\r\n?/g, "\n") === `# ${app.name} setup prompt\n\n${prompt}\n`,
      `Stale prompt artifact for ${app.slug}`,
    );
  }

  slugs.add(app.slug);
  names.add(app.name.toLowerCase());
}

const requestedCategoryCounts = new Map([
  ["AI Assistants & Coding Agents", 8],
  ["Professional IDEs & Mobile SDKs", 8],
  ["API, Networking & Database Clients", 8],
  ["Cloud Provider & Deployment CLIs", 8],
  ["Office, Notes & Team Collaboration", 8],
  ["Cloud Storage, Backup & File Transfer", 8],
  ["Remote Access, Virtualization & Containers", 8],
  ["Professional Creative Suites", 9],
  ["Audio, Podcast & Streaming Production", 8],
  ["Science, Engineering & Research", 8],
  ["Consumer Security, VPN & Identity", 8],
  ["OS Utilities & Desktop Enhancement", 10],
  ["Device Management & OEM Utilities", 8],
  ["Streaming, Reading & Consumer Media", 8],
  ["Business Intelligence & Enterprise Apps", 8],
]);

for (const [category, expectedCount] of requestedCategoryCounts) {
  const actualCount = professionalCatalog.filter((app) => app.category === category).length;
  assert(actualCount === expectedCount, `${category} must contain ${expectedCount} requested apps; received ${actualCount}`);
}

const setupFingerprints = new Map();
const installGuidance = new Map();
const verifyGuidance = new Map();
for (const app of professionalCatalog) {
  const fingerprint = [app.setup.install, app.setup.preserve, app.setup.safety, app.setup.verify]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  assert(!setupFingerprints.has(fingerprint), `Duplicated setup guidance: ${setupFingerprints.get(fingerprint)} and ${app.slug}`);
  assert(!installGuidance.has(app.setup.install), `Duplicated install guidance: ${installGuidance.get(app.setup.install)} and ${app.slug}`);
  assert(!verifyGuidance.has(app.setup.verify), `Duplicated verify guidance: ${verifyGuidance.get(app.setup.verify)} and ${app.slug}`);
  setupFingerprints.set(fingerprint, app.slug);
  installGuidance.set(app.setup.install, app.slug);
  verifyGuidance.set(app.setup.verify, app.slug);
}

for (let leftIndex = 0; leftIndex < professionalCatalog.length; leftIndex += 1) {
  const left = professionalCatalog[leftIndex];
  const leftWords = normalizedWords(Object.values(left.setup).join(" "));
  for (let rightIndex = leftIndex + 1; rightIndex < professionalCatalog.length; rightIndex += 1) {
    const right = professionalCatalog[rightIndex];
    const similarity = jaccardSimilarity(leftWords, normalizedWords(Object.values(right.setup).join(" ")));
    assert(similarity < 0.9, `Setup guidance is too similar for ${left.slug} and ${right.slug}: ${similarity.toFixed(3)}`);
  }
}

assert(Object.keys(prompts).length === 100, `Tailored prompt map must contain 100 prompts; received ${Object.keys(prompts).length}`);
assert(Object.keys(logoManifest).length === catalog.length, `Logo manifest must contain ${catalog.length} entries; received ${Object.keys(logoManifest).length}`);

assert(openSourceCatalog.length === 50, `Open-source catalog must contain 50 entries; received ${openSourceCatalog.length}`);
const openSourceSlugs = new Set();
const openSourceRepos = new Set();
const appRepos = new Set(
  catalog
    .map((app) => getOfficialSource(app))
    .filter((source) => source.type === "github")
    .map((source) => source.url.replace(/\/$/, "").toLowerCase()),
);

for (const [position, project] of openSourceCatalog.entries()) {
  assert(project.index === position + 1, `Invalid open-source index for ${project.slug ?? position}`);
  assert(typeof project.name === "string" && project.name.length > 1, `Missing open-source name at index ${project.index}`);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug), `Invalid open-source slug: ${project.slug}`);
  assert(!openSourceSlugs.has(project.slug), `Duplicate open-source slug: ${project.slug}`);
  const normalizedRepo = project.repo?.replace(/\/$/, "").toLowerCase();
  assert(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(project.repo), `Invalid open-source repository: ${project.repo}`);
  assert(!openSourceRepos.has(normalizedRepo), `Duplicate open-source repository: ${project.repo}`);
  assert(!appRepos.has(normalizedRepo), `Open-source repository already exists in the app catalog: ${project.repo}`);
  assert(/^https:\/\//.test(project.website), `Invalid open-source website: ${project.website}`);
  assert(typeof project.category === "string" && project.category.length > 2, `Missing open-source category for ${project.slug}`);
  assert(typeof project.description === "string" && project.description.length >= 40, `Incomplete open-source description for ${project.slug}`);
  assert(typeof project.reason === "string" && project.reason.length >= 20, `Incomplete curation reason for ${project.slug}`);
  assert(typeof project.popularitySignal === "string" && project.popularitySignal.length > 5, `Missing popularity signal for ${project.slug}`);
  assert(project.starsAsOf === "2026-07-18", `Stale popularity snapshot date for ${project.slug}`);
  openSourceSlugs.add(project.slug);
  openSourceRepos.add(normalizedRepo);
}

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
  `Validated ${catalog.length} apps, ${openSourceCatalog.length} extra open-source projects, ${bundles.length} bundles, ` +
    `${slugs.size} unique app slugs, ${Object.keys(prompts).length} tailored prompts, and ${Object.keys(logoManifest).length} local logos.`,
);
