import type { WorldCupHistoryCacheStore, WorldCupHistoryBundle } from "../types/worldCupHistory";
import { PROFILE_TTL_MS } from "./teamProfileCache";

export const WORLD_CUP_HISTORY_CACHE_KEY = "wc-world-cup-history-v1";

const EMPTY: WorldCupHistoryCacheStore = {
  version: 1,
  lastSyncAt: null,
  bundle: null,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function readWorldCupHistoryStore(): WorldCupHistoryCacheStore {
  if (typeof localStorage === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(WORLD_CUP_HISTORY_CACHE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return { ...EMPTY };
    return {
      version: 1,
      lastSyncAt: typeof parsed.lastSyncAt === "string" ? parsed.lastSyncAt : null,
      bundle: isRecord(parsed.bundle) ? (parsed.bundle as WorldCupHistoryBundle) : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeWorldCupHistoryStore(store: WorldCupHistoryCacheStore): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(WORLD_CUP_HISTORY_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function isWorldCupHistoryStale(lastSyncAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastSyncAt) return true;
  const ts = Date.parse(lastSyncAt);
  if (!Number.isFinite(ts)) return true;
  return now - ts >= PROFILE_TTL_MS;
}
