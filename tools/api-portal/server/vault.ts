import { fileURLToPath } from "node:url";
import { readFile, writeFile, rename, copyFile, readdir, stat, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import forge from "node-forge";
import { getKeychainKey } from "./keychain.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ApiKey = {
  id: string;
  serviceGroup: string;
  label: string;
  envVarName: string;
  value: string;
  endpoint?: string;
  testMethod?: "GET" | "POST";
  testHeaders?: Record<string, string>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
  lastTestStatus?: number;
  lastTestLatencyMs?: number;
};

export type VaultHistory = {
  id: string;
  timestamp: string;
  action: "create" | "update" | "delete" | "test" | "sync";
  keyId: string;
  label: string;
  envVarName: string;
  oldValueHash?: string;
  newValueHash?: string;
  meta?: string;
};

export type SyncTarget = {
  id: string;
  name: string;
  envFilePath: string;
  keyIds: string[];
  lastSyncedAt?: string;
};

export type VaultData = {
  version: 1;
  keys: ApiKey[];
  history: VaultHistory[];
  syncTargets: SyncTarget[];
};

// ─── Errors ──────────────────────────────────────────────────────────────────

export class VaultNotSetupError extends Error {
  constructor() {
    super("Vault master key not set up. Complete first-run setup first.");
    this.name = "VaultNotSetupError";
  }
}

// ─── Paths ───────────────────────────────────────────────────────────────────

const VAULT_PATH = fileURLToPath(new URL("../.portal-keys.enc", import.meta.url));
const VAULT_TMP_PATH = VAULT_PATH + ".tmp";
const VAULT_BAK_PREFIX = VAULT_PATH + ".bak.";

// ─── Master key cache with 30-min idle eviction ───────────────────────────────

let cachedMasterKey: string | null = null;
let lastActivityAt: number = 0;
const IDLE_TTL_MS = 30 * 60 * 1000;

function touchActivity(): void {
  lastActivityAt = Date.now();
}

function isCacheExpired(): boolean {
  if (!cachedMasterKey) return true;
  return Date.now() - lastActivityAt > IDLE_TTL_MS;
}

export function evictMasterKeyCache(): void {
  cachedMasterKey = null;
  lastActivityAt = 0;
}

export async function getMasterKey(): Promise<string> {
  if (!isCacheExpired() && cachedMasterKey) {
    touchActivity();
    return cachedMasterKey;
  }

  const key = await getKeychainKey();
  if (!key) throw new VaultNotSetupError();

  cachedMasterKey = key;
  touchActivity();
  return key;
}

export async function initMasterKey(passphrase: string): Promise<void> {
  const { setKeychainKey } = await import("./keychain.js");

  // PBKDF2: 100k iterations, SHA-256, 32-byte (256-bit) output
  const salt = forge.random.getBytesSync(16);
  const derivedBytes = forge.pkcs5.pbkdf2(passphrase, salt, 100000, 32, "sha256");
  const derivedHex = forge.util.bytesToHex(derivedBytes);

  // Store hex-encoded key in keychain. We don't need the salt separately —
  // the derived key IS the stored value; passphrase reset derives a new key.
  await setKeychainKey(derivedHex);
  cachedMasterKey = derivedHex;
  touchActivity();
}

// ─── Encryption helpers ───────────────────────────────────────────────────────

type EncryptedBlob = { iv: string; tag: string; data: string };

function encrypt(plaintext: string, keyHex: string): EncryptedBlob {
  const keyBytes = forge.util.hexToBytes(keyHex);
  const iv = forge.random.getBytesSync(12);
  const cipher = forge.cipher.createCipher("AES-GCM", keyBytes);
  cipher.start({ iv, tagLength: 128 });
  cipher.update(forge.util.createBuffer(plaintext, "utf8"));
  cipher.finish();

  return {
    iv: forge.util.bytesToHex(iv),
    tag: forge.util.bytesToHex(cipher.mode.tag.getBytes()),
    data: forge.util.bytesToHex(cipher.output.getBytes()),
  };
}

function decrypt(blob: EncryptedBlob, keyHex: string): string {
  const keyBytes = forge.util.hexToBytes(keyHex);
  const iv = forge.util.hexToBytes(blob.iv);
  const tag = forge.util.createBuffer(forge.util.hexToBytes(blob.tag));
  const encrypted = forge.util.hexToBytes(blob.data);

  const decipher = forge.cipher.createDecipher("AES-GCM", keyBytes);
  decipher.start({ iv, tag });
  decipher.update(forge.util.createBuffer(encrypted));
  const pass = decipher.finish();

  if (!pass) throw new Error("Vault decryption failed — wrong key or corrupted data.");
  return decipher.output.toString();
}

// ─── Backup helpers ───────────────────────────────────────────────────────────

async function backupVaultIfExists(): Promise<void> {
  if (!existsSync(VAULT_PATH)) return;

  const ts = Date.now();
  await copyFile(VAULT_PATH, `${VAULT_BAK_PREFIX}${ts}`);
  await pruneBackups();
}

async function pruneBackups(): Promise<void> {
  const dir = fileURLToPath(new URL("..", import.meta.url));
  const entries = await readdir(dir);
  const bakFiles = entries
    .filter((f) => f.startsWith(".portal-keys.enc.bak."))
    .map((f) => ({ name: f, path: `${dir}/${f}` }));

  if (bakFiles.length <= 3) return;

  // Sort by mtime ascending, remove oldest until only 3 remain
  const withStats = await Promise.all(
    bakFiles.map(async (f) => {
      const s = await stat(f.path);
      return { ...f, mtime: s.mtimeMs };
    })
  );
  withStats.sort((a, b) => a.mtime - b.mtime);

  const toDelete = withStats.slice(0, withStats.length - 3);
  await Promise.all(toDelete.map((f) => unlink(f.path)));
}

// ─── Public vault API ─────────────────────────────────────────────────────────

export function isVaultFilePresent(): boolean {
  return existsSync(VAULT_PATH);
}

const EMPTY_VAULT: VaultData = {
  version: 1,
  keys: [],
  history: [],
  syncTargets: [],
};

export async function readVault(): Promise<VaultData> {
  if (!isVaultFilePresent()) return structuredClone(EMPTY_VAULT);

  const masterKey = await getMasterKey();
  const raw = await readFile(VAULT_PATH, "utf8");
  const blob: EncryptedBlob = JSON.parse(raw) as EncryptedBlob;
  const plaintext = decrypt(blob, masterKey);
  return JSON.parse(plaintext) as VaultData;
}

export async function writeVault(
  data: VaultData,
  options: { destructive?: boolean } = {}
): Promise<void> {
  if (options.destructive) {
    await backupVaultIfExists();
  }

  const masterKey = await getMasterKey();
  const plaintext = JSON.stringify(data);
  const blob = encrypt(plaintext, masterKey);
  const json = JSON.stringify(blob);

  await writeFile(VAULT_TMP_PATH, json, "utf8");
  await rename(VAULT_TMP_PATH, VAULT_PATH);
}

export function hashValue(value: string): string {
  const md = forge.md.sha256.create();
  md.update(value, "utf8");
  return md.digest().toHex();
}
