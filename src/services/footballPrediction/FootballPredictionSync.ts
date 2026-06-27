import {
  delay,
  fetchDailyPredictionsPage,
  fetchLeagues,
  fetchPerformanceStats,
  fetchVipFeatured,
  fetchVipScores,
  isFootballPredictionDisabled,
} from "../FootballPredictionClient";
import {
  isFootballPredictionStale,
  readFootballPredictionStore,
  writeFootballPredictionStore,
} from "../../lib/footballPredictionCache";
import type { FootballPredictionBundle } from "../../types/footballPrediction";
import { logger } from "../Logger";

const PAGE_DELAY_MS = 650;
const MAX_PAGES = 20;

const UNAVAILABLE_ON_BASIC = ["predictions/featured", "predictions/scores"];

export function loadCachedFootballPredictionBundle(): FootballPredictionBundle | null {
  return readFootballPredictionStore().bundle;
}

export async function fetchAllDailyPredictions(): Promise<{
  matches: import("../FootballPredictionClient").FootballPredictionMatch[];
}> {
  const all: import("../FootballPredictionClient").FootballPredictionMatch[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_PAGES) {
    if (page > 1) await delay(PAGE_DELAY_MS);
    const result = await fetchDailyPredictionsPage(page);
    all.push(...result.matches);
    totalPages = result.totalPages || 1;
    if (result.matches.length === 0) break;
    page += 1;
  }

  return { matches: all };
}

export async function fetchFootballPredictionBundle(): Promise<FootballPredictionBundle> {
  const unavailable: string[] = [];

  const [leagues, performance] = await Promise.all([fetchLeagues(), fetchPerformanceStats()]);
  await delay(PAGE_DELAY_MS);
  const { matches: dailyPredictions } = await fetchAllDailyPredictions();

  await delay(PAGE_DELAY_MS);
  const vipFeatured = await fetchVipFeatured(1);
  if (vipFeatured.length === 0) unavailable.push(...UNAVAILABLE_ON_BASIC.slice(0, 1));

  await delay(PAGE_DELAY_MS);
  const vipScores = await fetchVipScores(1);
  if (vipScores.length === 0) unavailable.push(...UNAVAILABLE_ON_BASIC.slice(1));

  return {
    fetchedAt: new Date().toISOString(),
    leagues,
    performance,
    dailyPredictions,
    vipFeatured,
    vipScores,
    unavailable,
  };
}

export async function syncFootballPredictionsIfNeeded(
  onBundle?: (bundle: FootballPredictionBundle) => void
): Promise<FootballPredictionBundle | null> {
  if (isFootballPredictionDisabled()) return loadCachedFootballPredictionBundle();

  const store = readFootballPredictionStore();
  if (!isFootballPredictionStale(store.lastSyncAt) && store.bundle) {
    return store.bundle;
  }

  logger.info("Football prediction daily sync started", "FootballPredictionSync");

  try {
    const bundle = await fetchFootballPredictionBundle();
    const next = { version: 1 as const, lastSyncAt: new Date().toISOString(), bundle };
    writeFootballPredictionStore(next);
    onBundle?.(bundle);
    logger.info("Football prediction daily sync finished", "FootballPredictionSync", {
      predictions: bundle.dailyPredictions.length,
      leagues: bundle.leagues.length,
    });
    return bundle;
  } catch (error) {
    logger.warn("Football prediction sync failed", "FootballPredictionSync", {
      error: error instanceof Error ? error.message : String(error),
    });
    return store.bundle;
  }
}
