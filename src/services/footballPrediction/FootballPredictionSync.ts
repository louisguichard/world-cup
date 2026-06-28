import {
  delay,
  fetchCountries,
  fetchDailyPredictionsPage,
  fetchFederations,
  fetchLeagues,
  fetchMarkets,
  fetchPerformanceStats,
  findWorldCupLeague,
  isFootballPredictionDisabled,
  isWorldCupPrediction,
  type FootballPredictionMatch,
} from "../FootballPredictionClient";
import { FOOTBALL_PREDICTION_FEDERATIONS } from "../../config/footballPredictionEndpoints";
import {
  isFootballPredictionStale,
  readFootballPredictionStore,
  writeFootballPredictionStore,
} from "../../lib/footballPredictionCache";
import { buildPredictionIndex } from "../../lib/matchFootballPredictions";
import { wc2026SyncProbeDates } from "../../lib/wc2026TournamentWindow";
import type { FootballPredictionBundle } from "../../types/footballPrediction";
import { logger } from "../Logger";

const PAGE_DELAY_MS = 650;
const MAX_DEFAULT_PAGES = 3;

export function loadCachedFootballPredictionBundle(): FootballPredictionBundle | null {
  return readFootballPredictionStore().bundle;
}

function ingestPredictions(
  seen: Set<string>,
  all: FootballPredictionMatch[],
  matches: FootballPredictionMatch[]
): void {
  for (const match of matches) {
    if (seen.has(match.id)) continue;
    seen.add(match.id);
    all.push(match);
  }
}

async function fetchTournamentPredictions(): Promise<FootballPredictionMatch[]> {
  const seen = new Set<string>();
  const all: FootballPredictionMatch[] = [];
  const probeDates = wc2026SyncProbeDates();

  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= MAX_DEFAULT_PAGES) {
    if (page > 1) await delay(PAGE_DELAY_MS);
    const result = await fetchDailyPredictionsPage(page, { market: "classic" });
    ingestPredictions(seen, all, result.matches.filter(isWorldCupPrediction));
    totalPages = result.totalPages || 1;
    if (result.matches.length === 0) break;
    page += 1;
  }

  for (const isoDate of probeDates) {
    for (const federation of FOOTBALL_PREDICTION_FEDERATIONS) {
      await delay(PAGE_DELAY_MS);
      const result = await fetchDailyPredictionsPage(1, {
        federation,
        iso_date: isoDate,
        market: "classic",
      });
      ingestPredictions(seen, all, result.matches.filter(isWorldCupPrediction));
    }
  }

  return all;
}

async function fetchLeagueScopedPredictions(
  leagueId: string,
  season?: string
): Promise<FootballPredictionMatch[]> {
  const seen = new Set<string>();
  const all: FootballPredictionMatch[] = [];

  for (const isoDate of wc2026SyncProbeDates()) {
    await delay(PAGE_DELAY_MS);
    const result = await fetchDailyPredictionsPage(1, {
      league: leagueId,
      season,
      iso_date: isoDate,
      market: "classic",
    });
    ingestPredictions(seen, all, result.matches);
  }

  return all;
}

export async function fetchFootballPredictionBundle(
  teams: Record<string, import("../../types").Team> = {}
): Promise<FootballPredictionBundle> {
  const unavailable: string[] = [];

  const [federations, markets, countries, leagues, performance] = await Promise.all([
    fetchFederations(),
    fetchMarkets(),
    fetchCountries(),
    fetchLeagues(),
    fetchPerformanceStats({ market: "classic" }),
  ]);

  if (federations.length === 0) unavailable.push("list-federations");
  if (markets.length === 0) unavailable.push("list-markets");
  if (countries.length === 0) unavailable.push("list-countries");

  const worldCupLeague = findWorldCupLeague(leagues);

  await delay(PAGE_DELAY_MS);
  const tournamentPredictions = await fetchTournamentPredictions();

  let leaguePredictions: FootballPredictionMatch[] = [];
  if (worldCupLeague?.id) {
    await delay(PAGE_DELAY_MS);
    leaguePredictions = await fetchLeagueScopedPredictions(worldCupLeague.id);
  }

  const seen = new Set<string>();
  const dailyPredictions: FootballPredictionMatch[] = [];
  ingestPredictions(seen, dailyPredictions, tournamentPredictions);
  ingestPredictions(seen, dailyPredictions, leaguePredictions);

  const predictionByMatchId =
    Object.keys(teams).length > 0
      ? buildPredictionIndex(dailyPredictions, [], teams, { includeScheduleShells: true })
      : {};

  return {
    fetchedAt: new Date().toISOString(),
    federations,
    markets,
    countries,
    leagues,
    worldCupLeague,
    performance,
    dailyPredictions,
    predictionByMatchId,
    vipFeatured: [],
    vipScores: [],
    unavailable,
  };
}

export async function syncFootballPredictionsIfNeeded(
  onBundle?: (bundle: FootballPredictionBundle) => void,
  teams: Record<string, import("../../types").Team> = {}
): Promise<FootballPredictionBundle | null> {
  if (isFootballPredictionDisabled()) return loadCachedFootballPredictionBundle();

  const store = readFootballPredictionStore();
  if (!isFootballPredictionStale(store.lastSyncAt) && store.bundle) {
    return store.bundle;
  }

  logger.info("Football prediction daily sync started", "FootballPredictionSync");

  try {
    const bundle = await fetchFootballPredictionBundle(teams);
    const next = { version: 1 as const, lastSyncAt: new Date().toISOString(), bundle };
    writeFootballPredictionStore(next);
    onBundle?.(bundle);
    logger.info("Football prediction daily sync finished", "FootballPredictionSync", {
      predictions: bundle.dailyPredictions.length,
      linked: Object.keys(bundle.predictionByMatchId).length,
      worldCupLeague: bundle.worldCupLeague?.name ?? "none",
      leagues: bundle.leagues.length,
      federations: bundle.federations.length,
    });
    return bundle;
  } catch (error) {
    logger.warn("Football prediction sync failed", "FootballPredictionSync", {
      error: error instanceof Error ? error.message : String(error),
    });
    return store.bundle;
  }
}
