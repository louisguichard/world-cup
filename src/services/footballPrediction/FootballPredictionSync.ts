import {
  delay,
  fetchDailyPredictionsPage,
  fetchFederations,
  fetchLeagues,
  fetchMarkets,
  fetchPerformanceStats,
  isFootballPredictionDisabled,
} from "../FootballPredictionClient";
import { FOOTBALL_PREDICTION_FEDERATIONS } from "../../config/footballPredictionEndpoints";
import {
  fetchTodayDailyPredictionsPage,
  fetchTodayLeagues,
  fetchTodayPerformanceStats,
  fetchTodayVipFeatured,
  fetchTodayVipScores,
  isTodayFootballPredictionDisabled,
} from "../TodayFootballPredictionClient";
import {
  isFootballPredictionStale,
  readFootballPredictionStore,
  writeFootballPredictionStore,
} from "../../lib/footballPredictionCache";
import {
  mergeFootballLeagues,
  mergeFootballPredictionPools,
} from "../../lib/mergeFootballPredictions";
import type { FootballPredictionBundle } from "../../types/footballPrediction";
import { logger } from "../Logger";

const PAGE_DELAY_MS = 650;
const MAX_PAGES = 20;

const UNAVAILABLE_ON_BASIC = ["predictions/featured", "predictions/scores"];

export function loadCachedFootballPredictionBundle(): FootballPredictionBundle | null {
  return readFootballPredictionStore().bundle;
}

async function fetchAllBoggioDailyPredictions(): Promise<{
  matches: import("../FootballPredictionClient").FootballPredictionMatch[];
}> {
  const seen = new Set<string>();
  const all: import("../FootballPredictionClient").FootballPredictionMatch[] = [];

  const ingest = (matches: import("../FootballPredictionClient").FootballPredictionMatch[]) => {
    for (const match of matches) {
      if (seen.has(match.id)) continue;
      seen.add(match.id);
      all.push(match);
    }
  };

  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= MAX_PAGES) {
    if (page > 1) await delay(PAGE_DELAY_MS);
    const result = await fetchDailyPredictionsPage(page);
    ingest(result.matches);
    totalPages = result.totalPages || 1;
    if (result.matches.length === 0) break;
    page += 1;
  }

  for (const federation of FOOTBALL_PREDICTION_FEDERATIONS) {
    await delay(PAGE_DELAY_MS);
    const fedResult = await fetchDailyPredictionsPage(1, { federation });
    ingest(fedResult.matches);
  }

  return { matches: all };
}

async function fetchAllTodayDailyPredictions(): Promise<{
  matches: import("../FootballPredictionClient").FootballPredictionMatch[];
}> {
  const all: import("../FootballPredictionClient").FootballPredictionMatch[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_PAGES) {
    if (page > 1) await delay(PAGE_DELAY_MS);
    const result = await fetchTodayDailyPredictionsPage(page, { market: "1X2" });
    all.push(...result.matches);
    totalPages = result.totalPages || 1;
    if (result.matches.length === 0) break;
    page += 1;
  }

  return { matches: all };
}

export async function fetchFootballPredictionBundle(): Promise<FootballPredictionBundle> {
  const unavailable: string[] = [];

  const [
    todayLeagues,
    todayPerformance,
    federations,
    markets,
    boggioLeagues,
    boggioPerformance,
  ] = await Promise.all([
    isTodayFootballPredictionDisabled() ? Promise.resolve([]) : fetchTodayLeagues(),
    isTodayFootballPredictionDisabled() ? Promise.resolve(null) : fetchTodayPerformanceStats(),
    isFootballPredictionDisabled() ? Promise.resolve([]) : fetchFederations(),
    isFootballPredictionDisabled() ? Promise.resolve([]) : fetchMarkets(),
    isFootballPredictionDisabled() ? Promise.resolve([]) : fetchLeagues(),
    isFootballPredictionDisabled()
      ? Promise.resolve(null)
      : fetchPerformanceStats({ market: "classic" }),
  ]);

  if (federations.length === 0 && !isFootballPredictionDisabled()) {
    unavailable.push("list-federations");
  }
  if (markets.length === 0 && !isFootballPredictionDisabled()) {
    unavailable.push("list-markets");
  }
  if (todayLeagues.length === 0 && !isTodayFootballPredictionDisabled()) {
    unavailable.push("leagues");
  }

  await delay(PAGE_DELAY_MS);
  const { matches: boggioDaily } = isFootballPredictionDisabled()
    ? { matches: [] }
    : await fetchAllBoggioDailyPredictions();

  await delay(PAGE_DELAY_MS);
  const { matches: todayDaily } = isTodayFootballPredictionDisabled()
    ? { matches: [] }
    : await fetchAllTodayDailyPredictions();

  await delay(PAGE_DELAY_MS);
  const vipFeatured = isTodayFootballPredictionDisabled()
    ? []
    : await fetchTodayVipFeatured(1);
  if (vipFeatured.length === 0 && !isTodayFootballPredictionDisabled()) {
    unavailable.push(UNAVAILABLE_ON_BASIC[0]!);
  }

  await delay(PAGE_DELAY_MS);
  const vipScores = isTodayFootballPredictionDisabled() ? [] : await fetchTodayVipScores(1);
  if (vipScores.length === 0 && !isTodayFootballPredictionDisabled()) {
    unavailable.push(UNAVAILABLE_ON_BASIC[1]!);
  }

  const dailyPredictions = mergeFootballPredictionPools({
    todayDaily,
    boggioDaily,
    vipFeatured,
    vipScores,
  });

  const leagues = mergeFootballLeagues(todayLeagues, boggioLeagues);
  const performance = todayPerformance ?? boggioPerformance;

  return {
    fetchedAt: new Date().toISOString(),
    federations,
    markets,
    leagues,
    performance,
    dailyPredictions,
    vipFeatured,
    vipScores,
    todayDaily,
    boggioDaily,
    unavailable,
  };
}

export async function syncFootballPredictionsIfNeeded(
  onBundle?: (bundle: FootballPredictionBundle) => void
): Promise<FootballPredictionBundle | null> {
  if (isFootballPredictionDisabled() && isTodayFootballPredictionDisabled()) {
    return loadCachedFootballPredictionBundle();
  }

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
      merged: bundle.dailyPredictions.length,
      today: bundle.todayDaily.length,
      boggio: bundle.boggioDaily.length,
      vipFeatured: bundle.vipFeatured.length,
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
