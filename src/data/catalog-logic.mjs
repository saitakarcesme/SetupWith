export const supportedPlatforms = ["macOS", "Linux", "Windows", "Web"];
const defaultPlatforms = ["macOS", "Linux", "Windows"];

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

export function secretAlias(secret) {
  const parts = secret.toLowerCase().split("_");
  const provider = parts[0] || "private";
  const key = parts.slice(1).join("-") || "credential";
  return `secret://${provider}/${key}`;
}

export function getPlatforms(app) {
  return app.platforms ?? platformOverrides[app.slug] ?? defaultPlatforms;
}

export function getExperience(app) {
  if (app.vertical) return app.vertical;
  if (app.category === "AI & ML") return "ai";
  if (app.category === "Design & Media") return "creative";
  if (app.category === "Productivity") return "work";
  if (app.category === "Communication") return "social";
  return "software";
}

export function getOfficialSource(app) {
  if (app.source) return app.source;
  if (!app.repo) throw new Error(`Missing official source for ${app.slug}`);
  return { type: "github", url: app.repo };
}

export function getComplexity(app) {
  if (app.complexity) return app.complexity;
  if (app.mayInstallDrivers || app.mayInstallKernelComponents) {
    return "Advanced";
  }
  if (app.category === "DevOps & Cloud" || app.category === "Web & Self-hosted") {
    return "Advanced";
  }
  if (app.secrets.length > 0 || app.category === "Data & Databases") {
    return "Guided";
  }
  return "Simple";
}

export function getInstallTime(app) {
  if (app.installTime) return app.installTime;
  if (app.delivery === "source") return "5–10 min";
  if (app.delivery === "pwa") return "2–5 min";
  if (app.category === "Games & Launchers" || app.category === "Devices & Hardware") {
    return "5–15 min";
  }
  if (app.category === "Web & Self-hosted" || app.category === "DevOps & Cloud") {
    return "10–20 min";
  }
  return app.secrets.length > 0 ? "5–10 min" : "2–5 min";
}

export function buildGeneratedPrompt(app) {
  if (app.prompt) return app.prompt;
  if (!app.setup) {
    throw new Error(`Missing structured setup guidance for ${app.slug}`);
  }

  const preferences = app.config.length ? app.config.join(", ") : "none";
  const secretReferences = app.secrets.length
    ? `The only available credential references are ${app.secrets.map(secretAlias).join(", ")}. Treat every reference as opaque: never print, echo, log, resolve, or paste its value.`
    : "No credential references are needed for this setup.";

  const source = getOfficialSource(app);
  const experience = getExperience(app);
  const interactiveSetup = ["gaming", "entertainment", "work", "creative", "social", "browsers", "hardware"].includes(experience)
    ? `Browser Use and Computer Use may open the official page, download the approved signed installer, complete the visible installer flow, verify the publisher or code signature, and launch the product once. Stop and hand control to the user before account creation, sign-in, password entry, MFA, CAPTCHA, age verification, purchases, subscriptions, license acceptance that creates a paid obligation, or linking external accounts. Never bypass DRM, regional restrictions, or platform protections.`
    : "";
  const systemBoundaries = app.mayInstallDrivers || app.mayInstallKernelComponents || app.mayRequireRestart
    ? "Treat drivers, kernel components, anti-cheat, background services, overlays, firewall changes, startup items, and restarts as separate approval checkpoints. Explain the exact component, vendor, privileges, persistence, and rollback before continuing."
    : "Do not enable startup items, background services, overlays, notifications, analytics, or device permissions unless they are requested and separately approved.";

  return `Set up ${app.name} from its verified official source (${source.installUrl ?? source.url}). Supported targets: ${getPlatforms(app).join(", ")}. Begin with a read-only preflight covering the operating system, architecture, shell, package managers, disk space, relevant runtimes or hardware, and any existing installation. ${app.setup.install}

Preserve ${app.setup.preserve}. Back up files before editing and explain the selected version, source, location, dependencies, and commands. Apply only supplied, supported preferences: ${preferences}. ${secretReferences}

Ask before elevation, system-wide packages, services or startup items, ports or firewall rules, sign-in, large downloads, overwrites, or migrations. ${interactiveSetup} ${systemBoundaries} ${app.setup.safety} For a large game or media download, report the exact size, destination drive, free space, and bandwidth impact, then wait for approval. Never delete game libraries, save files, media libraries, mods, profiles, or cloud-sync data. If the platform or configuration is unsupported, stop and offer the closest official alternative.

${app.setup.verify} Report the version, executable, configuration and data paths, changed files, active processes or listeners, and verification evidence without exposing sensitive values. End with manual steps and exact rollback or uninstall instructions that remove only setup-owned changes, restore backups, stop new services, and preserve user data.`;
}
