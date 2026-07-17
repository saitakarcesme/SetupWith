"use client";

import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";

import {
  MINIMUM_PASSPHRASE_LENGTH,
  VAULT_STORAGE_EVENT,
  VAULT_STORAGE_KEY,
  VaultError,
  addVaultSecret,
  createSecretReference,
  createVault,
  isVaultSupported,
  listVaultAliases,
  removeVaultSecret,
  saveVault,
  unlockVault,
  type VaultAlias,
  type VaultData,
  type VaultKeyMaterial,
} from "@/lib/vault";

type BusyAction = "create" | "unlock" | "add" | "delete" | null;
type PanelMode = "checking" | "setup" | "locked" | "unlocked" | "unsupported";
type Notice = { readonly tone: "error" | "success" | "info"; readonly text: string };

export interface VaultPanelProps {
  className?: string;
}

const STORAGE_UNAVAILABLE = "__setupwith_storage_unavailable__";

const inputClassName =
  "h-11 w-full border border-black/35 bg-transparent px-3 text-sm font-normal text-black outline-none transition-colors placeholder:text-black/35 focus:border-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/35 dark:text-white dark:placeholder:text-white/35 dark:focus:border-white dark:focus-visible:ring-white dark:focus-visible:ring-offset-black";
const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center border border-black bg-black px-4 text-xs font-medium uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white dark:bg-white dark:text-black dark:hover:bg-black dark:hover:text-white dark:focus-visible:ring-white dark:focus-visible:ring-offset-black";
const secondaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center border border-black/35 bg-transparent px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-black transition-colors hover:border-black hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/35 dark:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-black dark:focus-visible:ring-white dark:focus-visible:ring-offset-black";

function subscribeToBrowserState(): () => void {
  return () => undefined;
}

function getBrowserSnapshot(): boolean {
  return true;
}

function getServerBrowserSnapshot(): boolean {
  return false;
}

function subscribeToVaultStorage(onStoreChange: () => void): () => void {
  function handleStorage(event: StorageEvent): void {
    if (event.key === null || event.key === VAULT_STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(VAULT_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(VAULT_STORAGE_EVENT, onStoreChange);
  };
}

function getVaultStorageSnapshot(): string | null {
  try {
    return window.localStorage.getItem(VAULT_STORAGE_KEY);
  } catch {
    return STORAGE_UNAVAILABLE;
  }
}

function getServerVaultStorageSnapshot(): null {
  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof VaultError) {
    return error.message;
  }

  return "Something went wrong while updating the encrypted vault.";
}

function referencePreview(provider: string, keyName: string): string {
  if (provider.trim().length === 0 && keyName.trim().length === 0) {
    return "secret://provider/key";
  }

  try {
    return createSecretReference(provider, keyName);
  } catch {
    return "secret://provider/key";
  }
}

function LockMark({ open = false }: { open?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d={open ? "M7 10V7a5 5 0 0 1 9.7-1.7" : "M7 10V7a5 5 0 0 1 10 0v3"}
        stroke="currentColor"
        strokeLinecap="square"
        strokeWidth="1.4"
      />
      <path d="M5 10h14v11H5z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 14v3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function VaultPanel({ className }: VaultPanelProps) {
  const id = useId();
  const keyMaterialRef = useRef<VaultKeyMaterial | null>(null);
  const vaultRef = useRef<VaultData | null>(null);
  const setupPassphraseRef = useRef<HTMLInputElement>(null);
  const setupConfirmationRef = useRef<HTMLInputElement>(null);
  const unlockPassphraseRef = useRef<HTMLInputElement>(null);
  const secretValueRef = useRef<HTMLInputElement>(null);
  const isBrowser = useSyncExternalStore(
    subscribeToBrowserState,
    getBrowserSnapshot,
    getServerBrowserSnapshot,
  );
  const storageSnapshot = useSyncExternalStore(
    subscribeToVaultStorage,
    getVaultStorageSnapshot,
    getServerVaultStorageSnapshot,
  );

  const [aliases, setAliases] = useState<readonly VaultAlias[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [provider, setProvider] = useState("");
  const [keyName, setKeyName] = useState("");
  const [label, setLabel] = useState("");
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  let mode: PanelMode;

  if (!isBrowser) {
    mode = "checking";
  } else if (
    storageSnapshot === STORAGE_UNAVAILABLE ||
    !isVaultSupported()
  ) {
    mode = "unsupported";
  } else if (isUnlocked) {
    mode = "unlocked";
  } else if (storageSnapshot !== null) {
    mode = "locked";
  } else {
    mode = "setup";
  }

  const isBusy = busy !== null;

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setNotice(null);
    const passphrase = setupPassphraseRef.current?.value ?? "";
    const confirmation = setupConfirmationRef.current?.value ?? "";

    if (passphrase !== confirmation) {
      setNotice({ tone: "error", text: "The passphrases do not match." });
      return;
    }

    setBusy("create");

    try {
      const unlocked = await createVault(passphrase);
      keyMaterialRef.current = unlocked.keyMaterial;
      vaultRef.current = unlocked.vault;
      setAliases(listVaultAliases(unlocked.vault));
      setIsUnlocked(true);
      if (setupPassphraseRef.current) {
        setupPassphraseRef.current.value = "";
      }
      if (setupConfirmationRef.current) {
        setupConfirmationRef.current.value = "";
      }
      setNotice({
        tone: "success",
        text: "Encrypted vault created. Your passphrase was not stored.",
      });
    } catch (error) {
      setNotice({ tone: "error", text: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function handleUnlock(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy("unlock");
    setNotice(null);
    const passphrase = unlockPassphraseRef.current?.value ?? "";

    try {
      const unlocked = await unlockVault(passphrase);
      keyMaterialRef.current = unlocked.keyMaterial;
      vaultRef.current = unlocked.vault;
      setAliases(listVaultAliases(unlocked.vault));
      setIsUnlocked(true);
      setNotice({ tone: "success", text: "Vault unlocked in this tab." });
    } catch (error) {
      setNotice({ tone: "error", text: getErrorMessage(error) });
    } finally {
      if (unlockPassphraseRef.current) {
        unlockPassphraseRef.current.value = "";
      }
      setBusy(null);
    }
  }

  async function handleAddSecret(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const keyMaterial = keyMaterialRef.current;
    const currentVault = vaultRef.current;

    if (currentVault === null || keyMaterial === null) {
      setNotice({
        tone: "error",
        text: "The vault is locked. Unlock it before adding a secret.",
      });
      return;
    }

    setBusy("add");
    setNotice(null);

    try {
      const value = secretValueRef.current?.value ?? "";
      const updatedVault = addVaultSecret(currentVault, {
        provider,
        key: keyName,
        label,
        value,
      });
      const persistedVault = await saveVault(updatedVault, keyMaterial);
      const reference = createSecretReference(provider, keyName);
      vaultRef.current = persistedVault;
      setAliases(listVaultAliases(persistedVault));
      setProvider("");
      setKeyName("");
      setLabel("");
      if (secretValueRef.current) {
        secretValueRef.current.value = "";
      }
      setNotice({
        tone: "success",
        text: `${reference} was encrypted and saved locally.`,
      });
    } catch (error) {
      setNotice({ tone: "error", text: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteSecret(secretId: string): Promise<void> {
    const keyMaterial = keyMaterialRef.current;
    const currentVault = vaultRef.current;

    if (currentVault === null || keyMaterial === null) {
      setNotice({ tone: "error", text: "Unlock the vault before deleting a secret." });
      return;
    }

    setBusy("delete");
    setNotice(null);

    try {
      const updatedVault = removeVaultSecret(currentVault, secretId);
      const persistedVault = await saveVault(updatedVault, keyMaterial);
      vaultRef.current = persistedVault;
      setAliases(listVaultAliases(persistedVault));
      setDeleteCandidateId(null);
      setNotice({ tone: "success", text: "Secret deleted from the encrypted vault." });
    } catch (error) {
      setNotice({ tone: "error", text: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  function handleLock(): void {
    keyMaterialRef.current = null;
    vaultRef.current = null;
    setAliases([]);
    setIsUnlocked(false);
    setProvider("");
    setKeyName("");
    setLabel("");
    if (secretValueRef.current) {
      secretValueRef.current.value = "";
    }
    setDeleteCandidateId(null);
    setNotice({ tone: "info", text: "Vault locked. Decrypted values left memory." });
  }

  async function handleCopy(reference: string): Promise<void> {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(reference);
      setNotice({
        tone: "success",
        text: "Secret reference copied. The underlying value was not copied.",
      });
    } catch {
      setNotice({
        tone: "error",
        text: "The reference could not be copied. Check clipboard permission.",
      });
    }
  }

  return (
    <section
      aria-busy={isBusy}
      aria-labelledby={`${id}-title`}
      className={[
        "w-full border border-black bg-white text-black dark:border-white dark:bg-black dark:text-white",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="flex flex-col gap-5 border-b border-black/25 p-5 dark:border-white/25 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-9 items-center justify-center border border-current">
            <LockMark open={mode === "unlocked"} />
          </span>
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.22em] opacity-55">
              Local credential layer
            </p>
            <h2
              className="text-xl font-light tracking-[-0.03em] sm:text-2xl"
              id={`${id}-title`}
            >
              SetupWith Vault
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start border border-current px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em]">
          <span
            aria-hidden="true"
            className={`size-1.5 ${mode === "unlocked" ? "bg-current" : "border border-current"}`}
          />
          {mode === "unlocked" ? "Unlocked" : mode === "checking" ? "Checking" : "Locked"}
        </div>
      </header>

      <div className="border-b border-black/15 px-5 py-3 text-xs font-light leading-5 text-black/65 dark:border-white/15 dark:text-white/65 sm:px-6">
        <p>
          PBKDF2 · AES-256-GCM · localStorage only. Prompts receive aliases such as{" "}
          <code className="font-mono text-[11px] text-black dark:text-white">
            secret://github/token
          </code>
          , never secret values.
        </p>
      </div>

      {notice !== null ? (
        <div
          className={`mx-5 mt-5 border px-3 py-2 text-xs leading-5 sm:mx-6 ${
            notice.tone === "error"
              ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
              : "border-black/35 text-black dark:border-white/35 dark:text-white"
          }`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      ) : null}

      {mode === "checking" ? (
        <div className="p-5 sm:p-6" role="status">
          <div className="h-3 w-32 animate-pulse bg-black/15 dark:bg-white/15" />
          <div className="mt-4 h-11 w-full animate-pulse border border-black/15 dark:border-white/15" />
          <span className="sr-only">Checking local vault support.</span>
        </div>
      ) : null}

      {mode === "unsupported" ? (
        <div className="p-5 sm:p-6">
          <h3 className="text-base font-medium">Vault unavailable</h3>
          <p className="mt-2 max-w-xl text-sm font-light leading-6 opacity-65">
            SetupWith needs Web Crypto and permission to use localStorage. Open this
            page in a current browser over HTTPS and allow site storage.
          </p>
        </div>
      ) : null}

      {mode === "setup" ? (
        <form className="p-5 sm:p-6" onSubmit={(event) => void handleCreate(event)}>
          <fieldset className="max-w-xl" disabled={isBusy}>
            <legend className="text-base font-medium">Create an encrypted vault</legend>
            <p className="mt-2 text-sm font-light leading-6 opacity-65">
              Choose a passphrase you can remember. SetupWith cannot recover it, and
              it never leaves this browser.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em]"
                  htmlFor={`${id}-setup-passphrase`}
                >
                  Passphrase
                </label>
                <input
                  autoComplete="new-password"
                  className={inputClassName}
                  id={`${id}-setup-passphrase`}
                  minLength={MINIMUM_PASSPHRASE_LENGTH}
                  ref={setupPassphraseRef}
                  required
                  type="password"
                />
              </div>
              <div>
                <label
                  className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em]"
                  htmlFor={`${id}-setup-confirmation`}
                >
                  Confirm passphrase
                </label>
                <input
                  autoComplete="new-password"
                  className={inputClassName}
                  id={`${id}-setup-confirmation`}
                  minLength={MINIMUM_PASSPHRASE_LENGTH}
                  ref={setupConfirmationRef}
                  required
                  type="password"
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] font-light opacity-55">
              Minimum {MINIMUM_PASSPHRASE_LENGTH} characters. No recovery or reset
              backdoor.
            </p>
            <button className={`${primaryButtonClassName} mt-5`} type="submit">
              {busy === "create" ? "Encrypting…" : "Create vault"}
            </button>
          </fieldset>
        </form>
      ) : null}

      {mode === "locked" ? (
        <form className="p-5 sm:p-6" onSubmit={(event) => void handleUnlock(event)}>
          <fieldset className="max-w-xl" disabled={isBusy}>
            <legend className="text-base font-medium">Unlock this browser&apos;s vault</legend>
            <p className="mt-2 text-sm font-light leading-6 opacity-65">
              Your passphrase derives a local decryption key. It is not sent to
              SetupWith or retained after unlock.
            </p>
            <div className="mt-5">
              <label
                className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em]"
                htmlFor={`${id}-unlock-passphrase`}
              >
                Passphrase
              </label>
              <input
                autoComplete="current-password"
                className={inputClassName}
                id={`${id}-unlock-passphrase`}
                ref={unlockPassphraseRef}
                required
                type="password"
              />
            </div>
            <button className={`${primaryButtonClassName} mt-5`} type="submit">
              {busy === "unlock" ? "Deriving key…" : "Unlock vault"}
            </button>
          </fieldset>
        </form>
      ) : null}

      {mode === "unlocked" ? (
        <div className="grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <form
            className="border-b border-black/20 p-5 dark:border-white/20 sm:p-6 lg:border-r lg:border-b-0"
            onSubmit={(event) => void handleAddSecret(event)}
          >
            <fieldset disabled={isBusy}>
              <legend className="text-base font-medium">Add a credential</legend>
              <p className="mt-2 text-sm font-light leading-6 opacity-65">
                The value is encrypted before localStorage is updated. Only its alias
                is safe to use in an install prompt.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em]"
                    htmlFor={`${id}-provider`}
                  >
                    Provider
                  </label>
                  <input
                    autoCapitalize="none"
                    autoComplete="off"
                    className={inputClassName}
                    id={`${id}-provider`}
                    maxLength={64}
                    onChange={(event) => setProvider(event.target.value)}
                    placeholder="github"
                    required
                    spellCheck={false}
                    value={provider}
                  />
                </div>
                <div>
                  <label
                    className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em]"
                    htmlFor={`${id}-key`}
                  >
                    Key
                  </label>
                  <input
                    autoCapitalize="none"
                    autoComplete="off"
                    className={inputClassName}
                    id={`${id}-key`}
                    maxLength={64}
                    onChange={(event) => setKeyName(event.target.value)}
                    placeholder="token"
                    required
                    spellCheck={false}
                    value={keyName}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label
                  className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em]"
                  htmlFor={`${id}-label`}
                >
                  Label <span className="font-light opacity-45">(optional)</span>
                </label>
                <input
                  autoComplete="off"
                  className={inputClassName}
                  id={`${id}-label`}
                  maxLength={80}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Personal account"
                  value={label}
                />
              </div>

              <div className="mt-4">
                <label
                  className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em]"
                  htmlFor={`${id}-secret-value`}
                >
                  Secret value
                </label>
                <input
                  autoCapitalize="none"
                  autoComplete="off"
                  className={inputClassName}
                  id={`${id}-secret-value`}
                  ref={secretValueRef}
                  required
                  spellCheck={false}
                  type="password"
                />
              </div>

              <div className="mt-4 border border-dashed border-black/30 px-3 py-2 dark:border-white/30">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-50">
                  Prompt-safe reference
                </p>
                <code className="mt-1 block break-all font-mono text-xs">
                  {referencePreview(provider, keyName)}
                </code>
              </div>

              <button className={`${primaryButtonClassName} mt-5 w-full sm:w-auto`} type="submit">
                {busy === "add" ? "Encrypting…" : "Encrypt & add"}
              </button>
            </fieldset>
          </form>

          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-medium">Saved aliases</h3>
                <p className="mt-1 text-xs font-light opacity-55">
                  {aliases.length} {aliases.length === 1 ? "credential" : "credentials"} encrypted
                </p>
              </div>
              <button
                className={secondaryButtonClassName}
                disabled={isBusy}
                onClick={handleLock}
                type="button"
              >
                Lock
              </button>
            </div>

            {aliases.length === 0 ? (
              <div className="mt-5 border border-dashed border-black/30 px-4 py-8 text-center dark:border-white/30">
                <p className="text-sm font-light opacity-55">No credentials stored yet.</p>
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-black/15 border border-black/25 dark:divide-white/15 dark:border-white/25">
                {aliases.map((alias) => (
                  <li className="p-4" key={alias.id}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-45">
                          {alias.label || `${alias.provider} credential`}
                        </p>
                        <code className="mt-1 block break-all font-mono text-xs leading-5">
                          {alias.reference}
                        </code>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          aria-label={`Copy ${alias.reference}`}
                          className={secondaryButtonClassName}
                          disabled={isBusy}
                          onClick={() => void handleCopy(alias.reference)}
                          type="button"
                        >
                          Copy alias
                        </button>
                        {deleteCandidateId === alias.id ? (
                          <>
                            <button
                              className={secondaryButtonClassName}
                              disabled={isBusy}
                              onClick={() => setDeleteCandidateId(null)}
                              type="button"
                            >
                              Cancel
                            </button>
                            <button
                              aria-label={`Confirm deletion of ${alias.reference}`}
                              className={primaryButtonClassName}
                              disabled={isBusy}
                              onClick={() => void handleDeleteSecret(alias.id)}
                              type="button"
                            >
                              {busy === "delete" ? "Deleting…" : "Confirm delete"}
                            </button>
                          </>
                        ) : (
                          <button
                            aria-label={`Delete ${alias.reference}`}
                            className={secondaryButtonClassName}
                            disabled={isBusy}
                            onClick={() => setDeleteCandidateId(alias.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 text-[11px] font-light leading-5 opacity-50">
              Locking clears the decrypted vault and derived key from this tab. The
              encrypted local copy remains available for your next unlock.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default VaultPanel;
