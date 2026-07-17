"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Check, Laptop, Save } from "lucide-react";

interface EnvironmentValues {
  operatingSystem: string;
  architecture: string;
  shell: string;
  packageManager: string;
  editor: string;
  projectsDirectory: string;
}

const defaultValues: EnvironmentValues = {
  operatingSystem: "auto",
  architecture: "auto",
  shell: "zsh",
  packageManager: "auto",
  editor: "Visual Studio Code",
  projectsDirectory: "~/Developer",
};

const storageKey = "setupwith:environment-profile:v1";
const storageEvent = "setupwith:environment-profile-change";

function subscribe(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === null || event.key === storageKey) onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(storageEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(storageEvent, onStoreChange);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function parseProfile(snapshot: string | null): EnvironmentValues {
  if (!snapshot) return defaultValues;
  try {
    return { ...defaultValues, ...JSON.parse(snapshot) } as EnvironmentValues;
  } catch {
    return defaultValues;
  }
}

export function EnvironmentProfile() {
  const storedProfile = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const [draftValues, setDraftValues] = useState<EnvironmentValues | null>(null);
  const [saved, setSaved] = useState(false);
  const values = draftValues ?? parseProfile(storedProfile);

  function updateValue(key: keyof EnvironmentValues, value: string) {
    setDraftValues((current) => ({ ...(current ?? values), [key]: value }));
    setSaved(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem(storageKey, JSON.stringify(values));
    window.dispatchEvent(new Event(storageEvent));
    setDraftValues(null);
    setSaved(true);
  }

  return (
    <section className="environment-panel" aria-labelledby="environment-profile-title">
      <header>
        <span className="profile-panel-icon"><Laptop size={19} strokeWidth={1.4} aria-hidden="true" /></span>
        <div>
          <span className="eyebrow">NON-SECRET CONTEXT</span>
          <h2 id="environment-profile-title">Environment profile</h2>
        </div>
        <span className="profile-local-badge">This browser</span>
      </header>
      <p className="profile-panel-intro">
        These defaults make prompts more precise. Codex still verifies the real machine before installing anything.
      </p>
      <form onSubmit={handleSubmit}>
        <label>
          <span>Operating system</span>
          <select value={values.operatingSystem} onChange={(event) => updateValue("operatingSystem", event.target.value)}>
            <option value="auto">Detect at run time</option>
            <option value="macOS">macOS</option>
            <option value="Linux">Linux</option>
            <option value="Windows">Windows</option>
          </select>
        </label>
        <label>
          <span>Architecture</span>
          <select value={values.architecture} onChange={(event) => updateValue("architecture", event.target.value)}>
            <option value="auto">Detect at run time</option>
            <option value="arm64">Apple silicon / ARM64</option>
            <option value="x64">Intel / x64</option>
          </select>
        </label>
        <label>
          <span>Preferred shell</span>
          <select value={values.shell} onChange={(event) => updateValue("shell", event.target.value)}>
            <option value="zsh">zsh</option>
            <option value="bash">bash</option>
            <option value="fish">fish</option>
            <option value="powershell">PowerShell</option>
          </select>
        </label>
        <label>
          <span>Package manager</span>
          <select value={values.packageManager} onChange={(event) => updateValue("packageManager", event.target.value)}>
            <option value="auto">Choose safest available</option>
            <option value="homebrew">Homebrew</option>
            <option value="apt">apt</option>
            <option value="winget">winget</option>
            <option value="nix">Nix</option>
          </select>
        </label>
        <label>
          <span>Preferred editor</span>
          <input value={values.editor} onChange={(event) => updateValue("editor", event.target.value)} />
        </label>
        <label>
          <span>Projects directory</span>
          <input value={values.projectsDirectory} onChange={(event) => updateValue("projectsDirectory", event.target.value)} spellCheck={false} />
        </label>
        <button type="submit">
          {saved ? <Check size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          {saved ? "Saved locally" : "Save environment"}
        </button>
      </form>
    </section>
  );
}
