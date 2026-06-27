import type { FootballPredictionCacheStore, FootballPredictionBundle } from "../types/footballPrediction";
import { PROFILE_TTL_MS } from "./teamProfileCache";

export const FOOTBALL_PREDICTION_CACHE_KEY = "wc-football-prediction-v1";

const EMPTY: FootballPredictionCacheStore = {
  version: 1,
  lastSyncAt: null,
  bundle: null,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function readFootballPredictionStore(): FootballPredictionCacheStore {
  if (typeof localStorage === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(FOOTBALL_PREDICTION_CACHE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return { ...EMPTY };
    return {
      version: 1,
      lastSyncAt: typeof parsed.lastSyncAt === "string" ? parsed.lastSyncAt : null,
      bundle: isRecord(parsed.bundle) ? (parsed.bundle as FootballPredictionBundle) : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeFootballPredictionStore(store: FootballPredictionCacheStore): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(FOOTBALL_PREDICTION_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function isFootballPredictionStale(lastSyncAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastSyncAt) return true;
  const ts = Date.parse(lastSyncAt);
  if (!Number.isFinite(ts)) return true;
  return now - ts >= PROFILE_TTL_MS;
}
