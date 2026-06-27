import { PROFILE_TTL_MS } from "./teamProfileCache";
import type { FootApi7Bundle, FootApi7CacheStore } from "../types/footApi7";

export const FOOTAPI7_CACHE_KEY = "wc-footapi7-v1";

const EMPTY: FootApi7CacheStore = {
  version: 1,
  lastSyncAt: null,
  bundle: null,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function readFootApi7Store(): FootApi7CacheStore {
  if (typeof localStorage === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(FOOTAPI7_CACHE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return { ...EMPTY };
    return {
      version: 1,
      lastSyncAt: typeof parsed.lastSyncAt === "string" ? parsed.lastSyncAt : null,
      bundle: isRecord(parsed.bundle) ? (parsed.bundle as FootApi7Bundle) : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeFootApi7Store(store: FootApi7CacheStore): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(FOOTAPI7_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function isFootApi7Stale(lastSyncAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastSyncAt) return true;
  const ts = Date.parse(lastSyncAt);
  if (!Number.isFinite(ts)) return true;
  return now - ts >= PROFILE_TTL_MS;
}

export function loadCachedFootApi7Bundle(): FootApi7Bundle | null {
  return readFootApi7Store().bundle;
}
