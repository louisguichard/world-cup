// keytar is an optional native dependency. If it fails to load (e.g. missing
// Xcode CLT on first install), we fall back to an in-memory session store.
// The vault stays encrypted at rest; the derived key lives in memory only.

import type { default as KeytarType } from "keytar";

const SERVICE = "api-vault-portal";
const ACCOUNT = "master";

let keytar: typeof KeytarType | null = null;
let keytarAvailable = false;

// Loaded once at module init — dynamic import so a failed native load doesn't
// crash the whole server process.
async function loadKeytar(): Promise<void> {
  try {
    const mod = await import("keytar");
    keytar = mod.default as typeof KeytarType;
    keytarAvailable = true;
  } catch {
    keytarAvailable = false;
  }
}

// Session-fallback store used when keytar is unavailable.
let sessionMasterKey: string | null = null;

// Initialise keytar on first use.
let initPromise: Promise<void> | null = null;
async function ensureLoaded(): Promise<void> {
  if (!initPromise) initPromise = loadKeytar();
  await initPromise;
}

export function isKeytarAvailable(): boolean {
  return keytarAvailable;
}

export async function getKeychainKey(): Promise<string | null> {
  await ensureLoaded();
  if (keytarAvailable && keytar) {
    return keytar.getPassword(SERVICE, ACCOUNT);
  }
  return sessionMasterKey;
}

export async function setKeychainKey(key: string): Promise<void> {
  await ensureLoaded();
  if (keytarAvailable && keytar) {
    await keytar.setPassword(SERVICE, ACCOUNT, key);
  } else {
    sessionMasterKey = key;
  }
}

export async function deleteKeychainKey(): Promise<void> {
  await ensureLoaded();
  if (keytarAvailable && keytar) {
    await keytar.deletePassword(SERVICE, ACCOUNT);
  }
  sessionMasterKey = null;
}

export async function isKeychainSetup(): Promise<boolean> {
  await ensureLoaded();
  const key = await getKeychainKey();
  return key !== null;
}

export function isSessionUnlocked(): boolean {
  return sessionMasterKey !== null;
}

export async function unlockSession(derivedKeyHex: string): Promise<void> {
  sessionMasterKey = derivedKeyHex;
}

export function lockSession(): void {
  sessionMasterKey = null;
}
