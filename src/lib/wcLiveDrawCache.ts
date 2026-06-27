import type { WcDrawFixture } from "../services/WorldCup2026LiveClient";

export const WC_LIVE_DRAW_CACHE_KEY = "wc-live-draw-v1";

const DRAW_TTL_MS = 60 * 60 * 1000; // 1 hour — matchIds appear closer to kickoff

export type WcLiveDrawCacheStore = {
  version: 1;
  lastSyncAt: string | null;
  fixtures: WcDrawFixture[];
};

const EMPTY: WcLiveDrawCacheStore = {
  version: 1,
  lastSyncAt: null,
  fixtures: [],
};

let memoryFixtures: WcDrawFixture[] = [];

export function readWcLiveDrawStore(): WcLiveDrawCacheStore {
  if (typeof localStorage === "undefined") {
    return {
      version: 1,
      lastSyncAt: memoryFixtures.length ? new Date().toISOString() : null,
      fixtures: memoryFixtures,
    };
  }
  try {
    const raw = localStorage.getItem(WC_LIVE_DRAW_CACHE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || (parsed as WcLiveDrawCacheStore).version !== 1) {
      return { ...EMPTY };
    }
    const store = parsed as WcLiveDrawCacheStore;
    memoryFixtures = store.fixtures;
    return store;
  } catch {
    return { ...EMPTY };
  }
}

export function writeWcLiveDrawStore(store: WcLiveDrawCacheStore): void {
  memoryFixtures = store.fixtures;
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(WC_LIVE_DRAW_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function isWcLiveDrawStale(lastSyncAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastSyncAt) return true;
  const ts = Date.parse(lastSyncAt);
  if (!Number.isFinite(ts)) return true;
  return now - ts >= DRAW_TTL_MS;
}

export function getCachedDrawFixtures(): WcDrawFixture[] {
  if (memoryFixtures.length > 0) return memoryFixtures;
  return readWcLiveDrawStore().fixtures;
}

export function setCachedDrawFixtures(fixtures: WcDrawFixture[]): void {
  writeWcLiveDrawStore({
    version: 1,
    lastSyncAt: new Date().toISOString(),
    fixtures,
  });
}
