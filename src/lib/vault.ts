/**
 * SetupWith's browser-only, zero-knowledge secret vault.
 *
 * The encrypted envelope is the only data written to localStorage. Passphrases
 * and decrypted values stay in memory, and callers should only place the
 * `secret://provider/key` references returned by this module in prompts.
 */

export const VAULT_STORAGE_KEY = "setupwith:secret-vault:v1";
export const VAULT_STORAGE_EVENT = "setupwith:vault-storage-change";
export const MINIMUM_PASSPHRASE_LENGTH = 12;

const VAULT_VERSION = 1 as const;
const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const AES_TAG_LENGTH = 128 as const;
const ADDITIONAL_DATA = "setupwith:secret-vault:v1";
const MAX_STORED_VAULT_LENGTH = 5_000_000;
const MAX_SECRET_LENGTH = 32_768;
const MAX_LABEL_LENGTH = 80;
const ALIAS_PART_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

export type VaultErrorCode =
  | "UNSUPPORTED"
  | "NOT_FOUND"
  | "WEAK_PASSPHRASE"
  | "INVALID_PASSPHRASE"
  | "CORRUPT_VAULT"
  | "STORAGE_FAILED"
  | "INVALID_ALIAS"
  | "DUPLICATE_ALIAS"
  | "INVALID_SECRET";

export class VaultError extends Error {
  readonly code: VaultErrorCode;

  constructor(code: VaultErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "VaultError";
    this.code = code;
  }
}

export interface VaultSecretInput {
  provider: string;
  key: string;
  value: string;
  label?: string;
}

export interface VaultSecret {
  readonly id: string;
  readonly provider: string;
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface VaultData {
  readonly version: typeof VAULT_VERSION;
  readonly secrets: readonly VaultSecret[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface VaultAlias {
  readonly id: string;
  readonly provider: string;
  readonly key: string;
  readonly label: string;
  readonly reference: `secret://${string}/${string}`;
  readonly updatedAt: string;
}

export interface VaultKeyMaterial {
  /** A non-extractable AES-GCM key. The passphrase is never retained. */
  readonly key: CryptoKey;
  /** Public KDF metadata needed when re-encrypting the vault. */
  readonly salt: string;
  readonly iterations: number;
}

export interface UnlockedVault {
  readonly vault: VaultData;
  readonly keyMaterial: VaultKeyMaterial;
}

interface StoredVaultEnvelope {
  readonly version: typeof VAULT_VERSION;
  readonly kdf: {
    readonly name: "PBKDF2";
    readonly hash: "SHA-256";
    readonly iterations: number;
    readonly salt: string;
  };
  readonly cipher: {
    readonly name: "AES-GCM";
    readonly iv: string;
    readonly tagLength: typeof AES_TAG_LENGTH;
  };
  readonly ciphertext: string;
  readonly updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCryptoApi(): Crypto {
  const cryptoApi = globalThis.crypto;

  if (!cryptoApi?.subtle) {
    throw new VaultError(
      "UNSUPPORTED",
      "This browser does not provide the Web Crypto API required by the vault.",
    );
  }

  return cryptoApi;
}

function getStorage(storage?: Storage): Storage {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    throw new VaultError(
      "UNSUPPORTED",
      "The secret vault is only available in a browser.",
    );
  }

  try {
    return window.localStorage;
  } catch (error) {
    throw new VaultError(
      "STORAGE_FAILED",
      "Local storage is unavailable. Check this site's browser permissions.",
      { cause: error },
    );
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch (error) {
    throw new VaultError("CORRUPT_VAULT", "The encrypted vault is damaged.", {
      cause: error,
    });
  }
}

function normalizeAliasPart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function validateAliasPart(value: string, field: "provider" | "key"): string {
  const normalized = normalizeAliasPart(value);

  if (!ALIAS_PART_PATTERN.test(normalized)) {
    throw new VaultError(
      "INVALID_ALIAS",
      `${field === "provider" ? "Provider" : "Key"} must be 1–64 characters and use only letters, numbers, dots, underscores, or hyphens.`,
    );
  }

  return normalized;
}

function validatePassphraseForCreation(passphrase: string): void {
  if (passphrase.length < MINIMUM_PASSPHRASE_LENGTH) {
    throw new VaultError(
      "WEAK_PASSPHRASE",
      `Use a passphrase with at least ${MINIMUM_PASSPHRASE_LENGTH} characters.`,
    );
  }
}

function createId(): string {
  const cryptoApi = getCryptoApi();

  if (typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  return bytesToBase64(cryptoApi.getRandomValues(new Uint8Array(18)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 20 &&
    Number.isFinite(Date.parse(value))
  );
}

function parseEnvelope(raw: string): StoredVaultEnvelope {
  if (raw.length > MAX_STORED_VAULT_LENGTH) {
    throw new VaultError("CORRUPT_VAULT", "The encrypted vault is too large.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new VaultError("CORRUPT_VAULT", "The encrypted vault is damaged.", {
      cause: error,
    });
  }

  if (
    !isRecord(parsed) ||
    parsed.version !== VAULT_VERSION ||
    !isRecord(parsed.kdf) ||
    parsed.kdf.name !== "PBKDF2" ||
    parsed.kdf.hash !== "SHA-256" ||
    typeof parsed.kdf.iterations !== "number" ||
    !Number.isInteger(parsed.kdf.iterations) ||
    parsed.kdf.iterations < 100_000 ||
    parsed.kdf.iterations > 10_000_000 ||
    typeof parsed.kdf.salt !== "string" ||
    !isRecord(parsed.cipher) ||
    parsed.cipher.name !== "AES-GCM" ||
    typeof parsed.cipher.iv !== "string" ||
    parsed.cipher.tagLength !== AES_TAG_LENGTH ||
    typeof parsed.ciphertext !== "string" ||
    !isIsoDate(parsed.updatedAt)
  ) {
    throw new VaultError(
      "CORRUPT_VAULT",
      "The encrypted vault has an invalid format.",
    );
  }

  const salt = base64ToBytes(parsed.kdf.salt);
  const iv = base64ToBytes(parsed.cipher.iv);
  const ciphertext = base64ToBytes(parsed.ciphertext);

  if (
    salt.byteLength < SALT_LENGTH ||
    salt.byteLength > 64 ||
    iv.byteLength !== IV_LENGTH ||
    ciphertext.byteLength <= AES_TAG_LENGTH / 8
  ) {
    throw new VaultError(
      "CORRUPT_VAULT",
      "The encrypted vault has invalid cryptographic metadata.",
    );
  }

  return parsed as unknown as StoredVaultEnvelope;
}

function parseVaultData(value: unknown): VaultData {
  if (
    !isRecord(value) ||
    value.version !== VAULT_VERSION ||
    !Array.isArray(value.secrets) ||
    !isIsoDate(value.createdAt) ||
    !isIsoDate(value.updatedAt)
  ) {
    throw new VaultError(
      "CORRUPT_VAULT",
      "The decrypted vault has an invalid format.",
    );
  }

  const seenAliases = new Set<string>();
  const seenIds = new Set<string>();
  const secrets: VaultSecret[] = value.secrets.map((candidate) => {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== "string" ||
      candidate.id.length === 0 ||
      candidate.id.length > 128 ||
      typeof candidate.provider !== "string" ||
      typeof candidate.key !== "string" ||
      typeof candidate.label !== "string" ||
      candidate.label.length > MAX_LABEL_LENGTH ||
      typeof candidate.value !== "string" ||
      candidate.value.length === 0 ||
      candidate.value.length > MAX_SECRET_LENGTH ||
      !isIsoDate(candidate.createdAt) ||
      !isIsoDate(candidate.updatedAt)
    ) {
      throw new VaultError(
        "CORRUPT_VAULT",
        "The decrypted vault contains an invalid secret entry.",
      );
    }

    const provider = validateAliasPart(candidate.provider, "provider");
    const key = validateAliasPart(candidate.key, "key");
    const alias = `${provider}/${key}`;

    if (seenAliases.has(alias) || seenIds.has(candidate.id)) {
      throw new VaultError(
        "CORRUPT_VAULT",
        "The decrypted vault contains duplicate entries.",
      );
    }

    seenAliases.add(alias);
    seenIds.add(candidate.id);

    return {
      id: candidate.id,
      provider,
      key,
      label: candidate.label,
      value: candidate.value,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    };
  });

  return {
    version: VAULT_VERSION,
    secrets,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

async function deriveEncryptionKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const cryptoApi = getCryptoApi();
  const encoder = new TextEncoder();
  const baseKey = await cryptoApi.subtle.importKey(
    "raw",
    toArrayBuffer(encoder.encode(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return cryptoApi.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptVault(
  vault: VaultData,
  keyMaterial: VaultKeyMaterial,
): Promise<StoredVaultEnvelope> {
  const cryptoApi = getCryptoApi();
  const encoder = new TextEncoder();
  const iv = cryptoApi.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = encoder.encode(JSON.stringify(vault));
  const ciphertext = await cryptoApi.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(encoder.encode(ADDITIONAL_DATA)),
      tagLength: AES_TAG_LENGTH,
    },
    keyMaterial.key,
    toArrayBuffer(plaintext),
  );

  return {
    version: VAULT_VERSION,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: keyMaterial.iterations,
      salt: keyMaterial.salt,
    },
    cipher: {
      name: "AES-GCM",
      iv: bytesToBase64(iv),
      tagLength: AES_TAG_LENGTH,
    },
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    updatedAt: vault.updatedAt,
  };
}

async function decryptVault(
  envelope: StoredVaultEnvelope,
  key: CryptoKey,
): Promise<VaultData> {
  const cryptoApi = getCryptoApi();
  const encoder = new TextEncoder();
  let plaintext: ArrayBuffer;

  try {
    plaintext = await cryptoApi.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(base64ToBytes(envelope.cipher.iv)),
        additionalData: toArrayBuffer(encoder.encode(ADDITIONAL_DATA)),
        tagLength: AES_TAG_LENGTH,
      },
      key,
      toArrayBuffer(base64ToBytes(envelope.ciphertext)),
    );
  } catch (error) {
    throw new VaultError(
      "INVALID_PASSPHRASE",
      "The passphrase is incorrect, or the encrypted vault is damaged.",
      { cause: error },
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(new TextDecoder().decode(plaintext));
  } catch (error) {
    throw new VaultError(
      "CORRUPT_VAULT",
      "The decrypted vault has an invalid format.",
      { cause: error },
    );
  }

  return parseVaultData(parsed);
}

function notifyStorageChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(VAULT_STORAGE_EVENT));
  }
}

function readStoredEnvelope(storage?: Storage): StoredVaultEnvelope {
  const target = getStorage(storage);
  let raw: string | null;

  try {
    raw = target.getItem(VAULT_STORAGE_KEY);
  } catch (error) {
    throw new VaultError(
      "STORAGE_FAILED",
      "The encrypted vault could not be read from this browser.",
      { cause: error },
    );
  }

  if (raw === null) {
    throw new VaultError("NOT_FOUND", "No encrypted vault exists yet.");
  }

  return parseEnvelope(raw);
}

/** Checks Web Crypto and localStorage without mutating either. */
export function isVaultSupported(): boolean {
  if (typeof window === "undefined" || !globalThis.crypto?.subtle) {
    return false;
  }

  try {
    void window.localStorage;
    return true;
  } catch {
    return false;
  }
}

/** Returns whether an encrypted envelope exists; it never decrypts its contents. */
export function vaultExists(storage?: Storage): boolean {
  const target = getStorage(storage);

  try {
    return target.getItem(VAULT_STORAGE_KEY) !== null;
  } catch (error) {
    throw new VaultError(
      "STORAGE_FAILED",
      "The encrypted vault could not be read from this browser.",
      { cause: error },
    );
  }
}

/**
 * Creates and persists an empty vault. Only the non-extractable key is returned;
 * the passphrase itself is not retained.
 */
export async function createVault(
  passphrase: string,
  storage?: Storage,
): Promise<UnlockedVault> {
  validatePassphraseForCreation(passphrase);

  if (vaultExists(storage)) {
    throw new VaultError(
      "STORAGE_FAILED",
      "An encrypted vault already exists in this browser.",
    );
  }

  const cryptoApi = getCryptoApi();
  const saltBytes = cryptoApi.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await deriveEncryptionKey(
    passphrase,
    saltBytes,
    PBKDF2_ITERATIONS,
  );
  const timestamp = new Date().toISOString();
  const vault: VaultData = {
    version: VAULT_VERSION,
    secrets: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const keyMaterial: VaultKeyMaterial = {
    key,
    salt: bytesToBase64(saltBytes),
    iterations: PBKDF2_ITERATIONS,
  };
  const persistedVault = await saveVault(vault, keyMaterial, storage);

  return { vault: persistedVault, keyMaterial };
}

/** Unlocks the local envelope and returns decrypted data plus a non-extractable key. */
export async function unlockVault(
  passphrase: string,
  storage?: Storage,
): Promise<UnlockedVault> {
  if (passphrase.length === 0) {
    throw new VaultError("INVALID_PASSPHRASE", "Enter your vault passphrase.");
  }

  const envelope = readStoredEnvelope(storage);
  const salt = base64ToBytes(envelope.kdf.salt);
  const key = await deriveEncryptionKey(
    passphrase,
    salt,
    envelope.kdf.iterations,
  );
  const vault = await decryptVault(envelope, key);

  return {
    vault,
    keyMaterial: {
      key,
      salt: envelope.kdf.salt,
      iterations: envelope.kdf.iterations,
    },
  };
}

/** Re-encrypts and atomically replaces the local envelope with a fresh IV. */
export async function saveVault(
  vault: VaultData,
  keyMaterial: VaultKeyMaterial,
  storage?: Storage,
): Promise<VaultData> {
  const target = getStorage(storage);
  const updatedVault: VaultData = {
    ...vault,
    updatedAt: new Date().toISOString(),
  };
  const envelope = await encryptVault(updatedVault, keyMaterial);

  try {
    target.setItem(VAULT_STORAGE_KEY, JSON.stringify(envelope));
  } catch (error) {
    throw new VaultError(
      "STORAGE_FAILED",
      "The encrypted vault could not be saved. Check available browser storage.",
      { cause: error },
    );
  }

  notifyStorageChanged();
  return updatedVault;
}

/** Canonicalizes an alias and returns the only value that should enter a prompt. */
export function createSecretReference(
  provider: string,
  key: string,
): `secret://${string}/${string}` {
  const normalizedProvider = validateAliasPart(provider, "provider");
  const normalizedKey = validateAliasPart(key, "key");
  return `secret://${normalizedProvider}/${normalizedKey}`;
}

/** Adds a secret immutably. Persist the returned value with `saveVault`. */
export function addVaultSecret(
  vault: VaultData,
  input: VaultSecretInput,
): VaultData {
  const provider = validateAliasPart(input.provider, "provider");
  const key = validateAliasPart(input.key, "key");
  const value = input.value;
  const label = input.label?.trim() ?? "";

  if (value.length === 0 || value.length > MAX_SECRET_LENGTH) {
    throw new VaultError(
      "INVALID_SECRET",
      `Secret values must contain 1–${MAX_SECRET_LENGTH.toLocaleString()} characters.`,
    );
  }

  if (label.length > MAX_LABEL_LENGTH) {
    throw new VaultError(
      "INVALID_SECRET",
      `Labels must be ${MAX_LABEL_LENGTH} characters or fewer.`,
    );
  }

  if (
    vault.secrets.some(
      (secret) => secret.provider === provider && secret.key === key,
    )
  ) {
    throw new VaultError(
      "DUPLICATE_ALIAS",
      `The alias secret://${provider}/${key} already exists.`,
    );
  }

  const timestamp = new Date().toISOString();
  const secret: VaultSecret = {
    id: createId(),
    provider,
    key,
    label,
    value,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    ...vault,
    secrets: [...vault.secrets, secret],
    updatedAt: timestamp,
  };
}

/** Removes one secret immutably. Persist the returned value with `saveVault`. */
export function removeVaultSecret(vault: VaultData, id: string): VaultData {
  const remainingSecrets = vault.secrets.filter((secret) => secret.id !== id);

  if (remainingSecrets.length === vault.secrets.length) {
    return vault;
  }

  return {
    ...vault,
    secrets: remainingSecrets,
    updatedAt: new Date().toISOString(),
  };
}

/** Returns display-safe aliases without exposing their underlying values. */
export function listVaultAliases(vault: VaultData): readonly VaultAlias[] {
  return vault.secrets
    .map((secret) => ({
      id: secret.id,
      provider: secret.provider,
      key: secret.key,
      label: secret.label,
      reference: createSecretReference(secret.provider, secret.key),
      updatedAt: secret.updatedAt,
    }))
    .sort((left, right) => left.reference.localeCompare(right.reference));
}

/**
 * Resolves a reference only at the execution boundary. Never interpolate the
 * returned value into a prompt, log, URL, analytics event, or rendered UI.
 */
export function resolveSecretReference(
  vault: VaultData,
  reference: string,
): string | undefined {
  const match = /^secret:\/\/([^/]+)\/([^/?#]+)$/.exec(reference);

  if (!match) {
    return undefined;
  }

  let canonicalReference: string;

  try {
    canonicalReference = createSecretReference(match[1], match[2]);
  } catch {
    return undefined;
  }

  const secret = vault.secrets.find(
    (candidate) =>
      createSecretReference(candidate.provider, candidate.key) ===
      canonicalReference,
  );

  return secret?.value;
}
