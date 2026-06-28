import type { FootballPredictionCacheStore, FootballPredictionBundle } from "../types/footballPrediction";
import { PROFILE_TTL_MS } from "./teamProfileCache";

export const FOOTBALL_PREDICTION_CACHE_KEY = "wc-football-prediction-v3";

const EMPTY: FootballPredictionCacheStore = {
  version: 1,
  lastSyncAt: null,
  bundle: null,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeBundle(raw: unknown): FootballPredictionBundle | null {
  if (!isRecord(raw)) return null;
  return {
    fetchedAt: typeof raw.fetchedAt === "string" ? raw.fetchedAt : new Date().toISOString(),
    federations: Array.isArray(raw.federations) ? (raw.federations as string[]) : [],
    markets: Array.isArray(raw.markets) ? (raw.markets as string[]) : [],
    countries: Array.isArray(raw.countries) ? (raw.countries as string[]) : [],
    leagues: Array.isArray(raw.leagues) ? (raw.leagues as FootballPredictionBundle["leagues"]) : [],
    worldCupLeague: isRecord(raw.worldCupLeague)
      ? (raw.worldCupLeague as FootballPredictionBundle["worldCupLeague"])
      : null,
    performance: isRecord(raw.performance)
      ? (raw.performance as FootballPredictionBundle["performance"])
      : null,
    dailyPredictions: Array.isArray(raw.dailyPredictions)
      ? (raw.dailyPredictions as FootballPredictionBundle["dailyPredictions"])
      : [],
    predictionByMatchId: isRecord(raw.predictionByMatchId)
      ? (raw.predictionByMatchId as FootballPredictionBundle["predictionByMatchId"])
      : {},
    vipFeatured: [],
    vipScores: [],
    unavailable: Array.isArray(raw.unavailable) ? (raw.unavailable as string[]) : [],
  };
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
      bundle: normalizeBundle(parsed.bundle),
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
