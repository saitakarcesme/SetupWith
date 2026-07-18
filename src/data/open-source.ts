import catalogData from "./open-source-catalog.json";

export const openSourceCategories = [
  "All",
  "Entertainment & Media",
  "Games & Creation",
  "Productivity & Knowledge",
  "Web & Self-hosted",
  "Security & Privacy",
  "System Utilities",
  "Developer Tools",
  "Automation & Data",
] as const;

export type OpenSourceCategory = Exclude<(typeof openSourceCategories)[number], "All">;

export interface OpenSourceCatalogEntry {
  index: number;
  name: string;
  slug: string;
  repo: string;
  website: string;
  category: OpenSourceCategory;
  description: string;
  simpleIconSlug: string | null;
  popularitySignal: string;
  reason: string;
  starsAsOf: string;
}

export interface OpenSourceProject extends OpenSourceCatalogEntry {
  accent: string;
  pattern: number;
  prompt: string;
}

export type OpenSourceProjectCard = Omit<OpenSourceProject, "prompt">;

const categoryAccents: Record<OpenSourceCategory, string> = {
  "Entertainment & Media": "#e5484d",
  "Games & Creation": "#7c3aed",
  "Productivity & Knowledge": "#087f8c",
  "Web & Self-hosted": "#2563eb",
  "Security & Privacy": "#b42318",
  "System Utilities": "#52606d",
  "Developer Tools": "#111111",
  "Automation & Data": "#c2410c",
};

function buildOpenSourcePrompt(project: OpenSourceCatalogEntry): string {
  return `Set up ${project.name} from its official open-source repository with a reviewable, permission-aware workflow.

Official repository: ${project.repo}
Official website: ${project.website}
Project: ${project.description}

Operating rules
- Treat the repository and its own documentation as the source of truth. Do not invent install, build, or test commands.
- Work only inside a target directory that you show me first. Never delete, reset, overwrite, or discard an existing checkout or user-owned files.
- Ask before sudo/admin elevation, global package installation, system services, firewall changes, opened ports, drivers, restarts, or destructive commands.
- Never request, print, echo, or persist credentials. If authentication is required, stop and hand the interactive step back to me.
- Prefer pinned versions and lockfiles already committed by the project. Do not silently upgrade unrelated dependencies.

[REVIEW]
1. Detect the operating system, architecture, shell, Git version, available disk space, package managers, language runtimes, container tools, and compilers that may be relevant.
2. Check whether the requested target path already exists. If it does, inspect its Git status and remote origin without modifying it.
3. Read the repository README, license, contribution guide, release notes, lockfiles, and official install/build/test documentation.
4. Present a concise plan containing the target path, branch or release, prerequisites, commands you intend to run, expected downloads, privileged steps, services or ports, verification, and rollback. Wait for approval before changing the machine.

[CLONE]
5. If no checkout exists, clone only ${project.repo} into the approved path. If a checkout exists, verify that its origin matches exactly; never replace it or run a hard reset. Preserve and report any local changes.
6. Record the resolved remote URL, checked-out branch or tag, and commit SHA.

[SETUP]
7. Follow the project's documented setup path for this machine. Install only the required dependencies and keep changes project-local whenever possible.
8. Before any privileged, global, background-service, network-listening, or configuration-writing step, explain the change and ask separately for approval.

[TEST]
9. Run the smallest documented verification first, then the relevant build, test, lint, or smoke command supported by the project. Do not claim success from installation output alone.
10. Report every command run, its meaningful result, the installed or built version, changed paths, running services and ports, and any skipped checks.

[ROLLBACK]
11. Finish with exact rollback steps for dependencies, generated files, services, and the cloned directory. Preserve caches and user data unless I explicitly approve their removal.

Stop and ask if the repository documentation is ambiguous, the working tree is dirty, prerequisites conflict, a command would leave the approved directory, or verification fails.`;
}

const catalog = catalogData as OpenSourceCatalogEntry[];

export const openSourceProjectCards: OpenSourceProjectCard[] = catalog.map((project) => ({
  ...project,
  accent: categoryAccents[project.category],
  pattern: (project.index % 6) + 1,
}));

export const openSourceProjects: OpenSourceProject[] = openSourceProjectCards.map((project) => ({
  ...project,
  prompt: buildOpenSourcePrompt(project),
}));

export function getOpenSourceProject(slug: string): OpenSourceProject | undefined {
  return openSourceProjects.find((project) => project.slug === slug);
}

export function getOpenSourceLogoUrl(project: OpenSourceCatalogEntry): string {
  if (project.simpleIconSlug) {
    return `https://cdn.simpleicons.org/${project.simpleIconSlug}`;
  }

  const owner = project.repo.replace("https://github.com/", "").split("/")[0];
  return `https://github.com/${owner}.png?size=192`;
}
