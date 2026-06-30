import type { MergedMatch } from "../types";
import { isMergedMatchEffectivelyLive } from "./matchLifecycle";
import { bootCacheSchemaFields, matchesBootCacheSchema } from "./bootCacheSchema";
import { BOOT_CACHE_SCHEMA_VERSION, BOOT_CACHE_VERSION } from "./bootCacheVersion";

export const LIVE_MATCH_CACHE_KEY = `wc-live-matches-v${BOOT_CACHE_VERSION}`;

type LiveMatchCacheStore = {
  version: typeof BOOT_CACHE_VERSION;
  _schemaVersion: typeof BOOT_CACHE_SCHEMA_VERSION;
  savedAt: string;
  matches: Record<string, MergedMatch>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function readLiveMatchCache(): Record<string, MergedMatch> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LIVE_MATCH_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !matchesBootCacheSchema(parsed)) {
      localStorage.removeItem(LIVE_MATCH_CACHE_KEY);
      return null;
    }
    if (!isRecord(parsed.matches)) return null;
    return parsed.matches as Record<string, MergedMatch>;
  } catch {
    return null;
  }
}

export function writeLiveMatchCache(matches: Record<string, MergedMatch>): void {
  if (typeof localStorage === "undefined") return;
  try {
    const store: LiveMatchCacheStore = {
      ...bootCacheSchemaFields(),
      savedAt: new Date().toISOString(),
      matches,
    };
    localStorage.setItem(LIVE_MATCH_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function hasLiveMatchesInCache(matches: Record<string, MergedMatch>): boolean {
  return Object.values(matches).some((m) => isMergedMatchEffectivelyLive(m));
}
