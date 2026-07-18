export interface EnvironmentValues {
  operatingSystem: string;
  architecture: string;
  shell: string;
  packageManager: string;
  editor: string;
  projectsDirectory: string;
}

export const defaultEnvironmentValues: EnvironmentValues = {
  operatingSystem: "auto",
  architecture: "auto",
  shell: "zsh",
  packageManager: "auto",
  editor: "Visual Studio Code",
  projectsDirectory: "~/Developer",
};

export const environmentProfileStorageKey = "setupwith:environment-profile:v1";
export const environmentProfileStorageEvent = "setupwith:environment-profile-change";

export function subscribeToEnvironmentProfile(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === null || event.key === environmentProfileStorageKey) onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(environmentProfileStorageEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(environmentProfileStorageEvent, onStoreChange);
  };
}

export function getEnvironmentProfileSnapshot() {
  try {
    return window.localStorage.getItem(environmentProfileStorageKey);
  } catch {
    return null;
  }
}

export function parseEnvironmentProfile(snapshot: string | null): EnvironmentValues {
  if (!snapshot) return defaultEnvironmentValues;
  try {
    return { ...defaultEnvironmentValues, ...JSON.parse(snapshot) } as EnvironmentValues;
  } catch {
    return defaultEnvironmentValues;
  }
}

export function buildEnvironmentContext(values: EnvironmentValues): string {
  const display = (value: string) => value === "auto" ? "detect and verify at run time" : value;

  return [
    "LOCAL NON-SECRET CONTEXT (user-reviewed; verify against the real machine before acting)",
    `- Operating system: ${display(values.operatingSystem)}`,
    `- Architecture: ${display(values.architecture)}`,
    `- Preferred shell: ${values.shell}`,
    `- Preferred package manager: ${display(values.packageManager)}`,
    `- Preferred editor: ${values.editor}`,
    `- Projects directory: ${values.projectsDirectory}`,
    "Use these only as preferences, never as proof of machine state. No secret values are included.",
  ].join("\n");
}
