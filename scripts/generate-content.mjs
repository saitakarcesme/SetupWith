import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const catalog = JSON.parse(await readFile(resolve(projectRoot, "src/data/chatgpt-catalog.json"), "utf8"));
const prompts = JSON.parse(await readFile(resolve(projectRoot, "src/data/app-prompts.json"), "utf8"));

const platformOverrides = {
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

function secretAlias(secret) {
  const parts = secret.toLowerCase().split("_");
  return `secret://${parts[0] || "private"}/${parts.slice(1).join("-") || "credential"}`;
}

function complexity(app) {
  if (app.category === "DevOps & Cloud" || app.category === "Web & Self-hosted") return "Advanced";
  if (app.secrets.length > 0 || app.category === "Data & Databases") return "Guided";
  return "Simple";
}

function installTime(app) {
  if (app.category === "Web & Self-hosted" || app.category === "DevOps & Cloud") return "10–20 min";
  if (app.secrets.length > 0) return "5–10 min";
  return "2–5 min";
}

for (const app of catalog) {
  const directory = resolve(projectRoot, "content/apps", app.slug);
  await mkdir(directory, { recursive: true });

  const identity = {
    index: app.index,
    name: app.name,
    slug: app.slug,
    repo: app.repo,
    website: app.website,
    category: app.category,
    description: app.description,
    accent: app.accent,
    simpleIconSlug: app.simpleIconSlug,
  };
  const context = {
    platforms: platformOverrides[app.slug] ?? ["macOS", "Linux", "Windows"],
    installTime: installTime(app),
    complexity: complexity(app),
    preferences: app.config,
    secrets: app.secrets.map((key) => ({ key, reference: secretAlias(key) })),
    permissionCheckpoints: [
      "administrator access",
      "configuration overwrite",
      "service or daemon changes",
      "ports and firewall rules",
      "browser sign-in",
    ],
  };

  await writeFile(resolve(directory, "identity.json"), `${JSON.stringify(identity, null, 2)}\n`, "utf8");
  await writeFile(resolve(directory, "context.json"), `${JSON.stringify(context, null, 2)}\n`, "utf8");
  await writeFile(resolve(directory, "prompt.md"), `# ${app.name} setup prompt\n\n${prompts[app.slug]}\n`, "utf8");
}

console.log(`Generated ${catalog.length * 3} auditable content files for ${catalog.length} apps.`);
