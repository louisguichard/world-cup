import type { MergedMatch } from "../types";

export const LIVE_MATCH_CACHE_KEY = "wc-live-matches-v1";

type LiveMatchCacheStore = {
  version: 1;
  savedAt: string;
  matches: Record<string, MergedMatch>;
};

const EMPTY: LiveMatchCacheStore = {
  version: 1,
  savedAt: "",
  matches: {},
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
    if (!isRecord(parsed) || parsed.version !== 1) return null;
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
      version: 1,
      savedAt: new Date().toISOString(),
      matches,
    };
    localStorage.setItem(LIVE_MATCH_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function hasLiveMatchesInCache(matches: Record<string, MergedMatch>): boolean {
  return Object.values(matches).some((m) => m.status === "live");
}
