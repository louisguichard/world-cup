import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { isApiEnabled } from "../config/apiFlags";
import type { ApiRequestIntent } from "../config/apiQuotaPolicy";
import { acquireApiQuota, logApiQuotaBlock } from "./ApiQuotaGovernor";
import {
  FOOTBALL_PREDICTION_HOST,
  FOOTBALL_PREDICTION_WC_LEAGUE_HINTS,
  footballPredictionEndpoints,
  type FootballPredictionFederation,
  type FootballPredictionMarket,
} from "../config/footballPredictionEndpoints";
import { logger } from "./Logger";

let sessionDisabled = false;

export function isFootballPredictionDisabled(): boolean {
  return sessionDisabled;
}

export function resetFootballPredictionSessionForTests(): void {
  sessionDisabled = false;
}

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${FOOTBALL_PREDICTION_HOST}`;
  }
  return "/api/football-prediction";
}

function headers(): HeadersInit {
  return rapidApiHeaders(
    providerByHost(FOOTBALL_PREDICTION_HOST)?.host ?? FOOTBALL_PREDICTION_HOST
  );
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function unwrapData<T>(raw: unknown): T | null {
  if (!isRecord(raw)) return null;
  if ("data" in raw) return raw.data as T;
  return raw as T;
}

async function fetchJson<T = unknown>(
  path: string,
  context: string,
  intent: ApiRequestIntent = "background"
): Promise<T | null> {
  if (sessionDisabled || !isApiEnabled("footballPrediction")) return null;

  const quota = acquireApiQuota("footballPrediction", intent);
  if (!quota.allowed) {
    logApiQuotaBlock("footballPrediction", intent, quota);
    return null;
  }

  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: headers() });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      if (res.status === 429) {
        sessionDisabled = true;
      }
      logger.warn(`FootballPrediction ${context} blocked`, "FootballPredictionClient", {
        status: res.status,
      });
      return null;
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      logger.warn(`FootballPrediction ${context} failed`, "FootballPredictionClient", {
        status: res.status,
        path,
      });
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    logger.warn(`FootballPrediction ${context} error`, "FootballPredictionClient", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export type FootballPredictionLeague = {
  id: string;
  name: string;
  country: string;
};

export type FootballPredictionMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  dateTime?: string;
  leagueId: string;
  prediction: string;
  predictionOdd?: number;
  predictionProbability?: number;
  isFinished: boolean;
  federation?: string;
  market?: string;
  competitionName?: string;
  status?: string;
  result?: string;
  /** Origin provider — merged when both APIs agree. */
  source?: "today" | "boggio" | "merged";
  sources?: Array<"today" | "boggio">;
  /** Today API VIP tier when applicable. */
  vipTier?: "featured" | "scores";
};

export type FootballPredictionPerformanceMarket = {
  profitLoss: number;
  winningPercentage: number;
  count: number;
  countWon: number;
  countLost: number;
  avgProb: number;
  avgOdd: number;
};

export type FootballPredictionPerformance = {
  date: string;
  featured: Record<string, FootballPredictionPerformanceMarket>;
  all: Record<string, FootballPredictionPerformanceMarket>;
  /** Raw v2 accuracy windows when available. */
  accuracy?: {
    yesterday?: number;
    last7Days?: number;
    last14Days?: number;
    last30Days?: number;
  };
};

function probabilityPercent(raw: unknown, prediction: string | undefined): number | undefined {
  if (!isRecord(raw) || !prediction) return undefined;
  const p = num(raw[prediction]) ?? num(raw[prediction.toLowerCase()]);
  if (p == null) return undefined;
  return p <= 1 ? Math.round(p * 1000) / 10 : p;
}

function oddForPrediction(raw: unknown, prediction: string | undefined): number | undefined {
  if (!isRecord(raw) || !prediction) return undefined;
  return num(raw[prediction]) ?? num(raw[prediction.toLowerCase()]);
}

function normalizePerformanceMarket(raw: unknown): FootballPredictionPerformanceMarket | null {
  if (!isRecord(raw)) return null;
  return {
    profitLoss: num(raw.profit_loss) ?? 0,
    winningPercentage: num(raw.winning_percentage) ?? 0,
    count: num(raw.count) ?? num(raw.total) ?? 0,
    countWon: num(raw.count_won) ?? num(raw.won) ?? 0,
    countLost: num(raw.count_lost) ?? num(raw.lost) ?? 0,
    avgProb: num(raw.avg_prob) ?? 0,
    avgOdd: num(raw.avg_odd) ?? 0,
  };
}

function marketFromV2Accuracy(
  accuracy: number | undefined,
  details: Record<string, unknown> | undefined
): FootballPredictionPerformanceMarket | null {
  if (accuracy == null && !details) return null;
  const pct = accuracy != null ? (accuracy <= 1 ? accuracy * 100 : accuracy) : 0;
  return {
    profitLoss: 0,
    winningPercentage: Math.round(pct * 10) / 10,
    count: num(details?.total) ?? 0,
    countWon: num(details?.won) ?? 0,
    countLost: num(details?.lost) ?? 0,
    avgProb: 0,
    avgOdd: 0,
  };
}

function normalizePerformanceBucket(raw: unknown): Record<string, FootballPredictionPerformanceMarket> {
  if (!isRecord(raw)) return {};
  const out: Record<string, FootballPredictionPerformanceMarket> = {};
  for (const [key, value] of Object.entries(raw)) {
    const market = normalizePerformanceMarket(value);
    if (market) out[key] = market;
  }
  return out;
}

export function normalizePerformanceStats(raw: unknown): FootballPredictionPerformance | null {
  if (!isRecord(raw)) return null;

  const legacyDate = str(raw.date);
  if (legacyDate) {
    return {
      date: legacyDate,
      featured: normalizePerformanceBucket(raw.featured),
      all: normalizePerformanceBucket(raw.all),
    };
  }

  const data = isRecord(raw.data) ? raw.data : raw;
  const market = str(data.market) ?? "classic";
  const accuracy = isRecord(data.accuracy) ? data.accuracy : {};
  const details = isRecord(data.details) ? data.details : {};
  const today = new Date().toISOString().slice(0, 10);

  const featured = marketFromV2Accuracy(
    num(accuracy.last_7_days),
    isRecord(details.last_7_days) ? details.last_7_days : undefined
  );
  const all = marketFromV2Accuracy(
    num(accuracy.last_30_days),
    isRecord(details.last_30_days) ? details.last_30_days : undefined
  );

  return {
    date: today,
    featured: featured ? { [market]: featured } : {},
    all: all ? { [market]: all } : {},
    accuracy: {
      yesterday: num(accuracy.yesterday),
      last7Days: num(accuracy.last_7_days),
      last14Days: num(accuracy.last_14_days),
      last30Days: num(accuracy.last_30_days),
    },
  };
}

export function normalizePredictionMatch(raw: unknown): FootballPredictionMatch | null {
  if (!isRecord(raw)) return null;

  const id = raw.id != null ? String(raw.id) : str(raw.id);
  const homeTeam = str(raw.home_team);
  const awayTeam = str(raw.away_team);
  const startDate = str(raw.start_date) ?? str(raw.date_time) ?? str(raw.date);
  const date = startDate?.slice(0, 10);
  const leagueId =
    str(raw.league) ??
    str(raw.competition_name) ??
    str(raw.competition_cluster) ??
    str(raw.league_id);
  const prediction = str(raw.prediction);
  if (!id || !homeTeam || !awayTeam || !date || !leagueId || !prediction) return null;

  const probabilities = isRecord(raw.probabilities) ? raw.probabilities : undefined;
  const odds = isRecord(raw.odds) ? raw.odds : undefined;
  const status = str(raw.status);
  const result = str(raw.result);

  return {
    id,
    homeTeam,
    awayTeam,
    date,
    dateTime: startDate,
    leagueId,
    prediction,
    predictionOdd: oddForPrediction(odds, prediction) ?? num(raw.prediction_odd),
    predictionProbability:
      probabilityPercent(probabilities, prediction) ?? num(raw.prediction_probability),
    isFinished:
      raw.is_finished === true ||
      raw.is_expired === true ||
      (status != null && status !== "pending") ||
      Boolean(result),
    federation: str(raw.federation),
    market: str(raw.market),
    competitionName: str(raw.competition_name),
    status,
    result,
    source: "boggio",
  };
}

export function normalizeLeagues(raw: unknown): FootballPredictionLeague[] {
  const data = unwrapData<unknown[]>(raw);
  const list = Array.isArray(data)
    ? data
    : isRecord(raw) && Array.isArray(raw.leagues)
      ? raw.leagues
      : [];

  return list
    .filter(isRecord)
    .map((l) => ({
      id: str(l.id) ?? str(l.league_id) ?? str(l.name) ?? "",
      name: str(l.name) ?? str(l.league_name) ?? "",
      country: str(l.country) ?? str(l.country_name) ?? "",
    }))
    .filter((l) => l.id && l.name);
}

export function normalizeStringList(raw: unknown): string[] {
  const data = unwrapData<unknown[]>(raw);
  if (!Array.isArray(data)) return [];
  return data.map((item) => (typeof item === "string" ? item : String(item))).filter(Boolean);
}

export async function fetchConnectionTest(): Promise<boolean> {
  const data = await fetchJson<unknown>(
    footballPredictionEndpoints.connectionTest(),
    "connection-test",
    "test"
  );
  return data != null;
}

export async function fetchCountries(): Promise<string[]> {
  const data = await fetchJson<unknown>(footballPredictionEndpoints.listCountries(), "list-countries");
  return normalizeStringList(data);
}

export async function fetchSeasons(league: string): Promise<string[]> {
  const data = await fetchJson<unknown>(
    footballPredictionEndpoints.listSeasons({ league }),
    "list-seasons"
  );
  return normalizeStringList(data);
}

export async function fetchTeams(opts: {
  league: string;
  season?: string;
}): Promise<string[]> {
  const data = await fetchJson<unknown>(
    footballPredictionEndpoints.listTeams(opts),
    "list-teams"
  );
  return normalizeStringList(data);
}

export function findWorldCupLeague(
  leagues: FootballPredictionLeague[]
): FootballPredictionLeague | null {
  for (const league of leagues) {
    const haystack = `${league.name} ${league.country} ${league.id}`.toLowerCase();
    if (FOOTBALL_PREDICTION_WC_LEAGUE_HINTS.some((hint) => haystack.includes(hint))) {
      return league;
    }
  }
  return null;
}

export function isWorldCupPrediction(match: FootballPredictionMatch): boolean {
  const comp = `${match.competitionName ?? ""} ${match.leagueId ?? ""}`.toLowerCase();
  return FOOTBALL_PREDICTION_WC_LEAGUE_HINTS.some((hint) => comp.includes(hint));
}

export async function fetchHeadToHead(id: string | number): Promise<unknown> {
  return fetchJson<unknown>(footballPredictionEndpoints.headToHead(id), "head-to-head");
}

export async function fetchHomeLeagueStats(id: string | number): Promise<unknown> {
  return fetchJson<unknown>(footballPredictionEndpoints.homeLeagueStats(id), "home-league-stats");
}

export async function fetchAwayLeagueStats(id: string | number): Promise<unknown> {
  return fetchJson<unknown>(footballPredictionEndpoints.awayLeagueStats(id), "away-league-stats");
}

export async function fetchHomeLast10(id: string | number): Promise<unknown> {
  return fetchJson<unknown>(footballPredictionEndpoints.homeLast10(id), "home-last-10");
}

export async function fetchAwayLast10(id: string | number): Promise<unknown> {
  return fetchJson<unknown>(footballPredictionEndpoints.awayLast10(id), "away-last-10");
}

export async function fetchFederations(): Promise<string[]> {
  const data = await fetchJson<unknown>(footballPredictionEndpoints.listFederations(), "list-federations");
  return normalizeStringList(data);
}

export async function fetchMarkets(): Promise<string[]> {
  const data = await fetchJson<unknown>(footballPredictionEndpoints.listMarkets(), "list-markets");
  const payload = unwrapData<unknown>(data);
  if (Array.isArray(payload)) return normalizeStringList(data);
  if (isRecord(payload) && Array.isArray(payload.markets)) {
    return payload.markets.map(String);
  }
  if (isRecord(payload) && Array.isArray(payload.enabled_markets)) {
    return payload.enabled_markets.map(String);
  }
  return [];
}

export async function fetchLeagues(opts?: {
  federation?: FootballPredictionFederation;
  country?: string;
}): Promise<FootballPredictionLeague[]> {
  const data = await fetchJson<unknown>(footballPredictionEndpoints.listLeagues(opts), "list-leagues");
  return normalizeLeagues(data);
}

export async function fetchPerformanceStats(opts?: {
  federation?: FootballPredictionFederation;
  market?: FootballPredictionMarket;
}): Promise<FootballPredictionPerformance | null> {
  const data = await fetchJson<unknown>(
    footballPredictionEndpoints.performanceStats(opts),
    "performance-stats"
  );
  return normalizePerformanceStats(data);
}

export async function fetchDailyPredictionsPage(
  page = 1,
  opts?: {
    date?: string;
    iso_date?: string;
    market?: FootballPredictionMarket;
    federation?: FootballPredictionFederation;
    league?: string;
    season?: string;
  }
): Promise<{ matches: FootballPredictionMatch[]; totalPages: number; total: number }> {
  const data = await fetchJson<unknown>(
    footballPredictionEndpoints.predictions({
      page,
      iso_date: opts?.iso_date ?? opts?.date,
      market: opts?.market,
      federation: opts?.federation,
      league: opts?.league,
      season: opts?.season,
    }),
    "predictions"
  );

  const list = unwrapData<unknown[]>(data);
  const matches = (Array.isArray(list) ? list : [])
    .map(normalizePredictionMatch)
    .filter((m): m is FootballPredictionMatch => m !== null);

  const pagination = isRecord(data) && isRecord(data.pagination) ? data.pagination : {};
  const total = num(pagination.no_of_docs_total) ?? matches.length;
  const pageSize = num(pagination.no_of_docs_in_page) ?? matches.length;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : matches.length > 0 ? 1 : 0;

  return { matches, totalPages: totalPages || 1, total };
}

export async function fetchPredictionDetails(
  id: string | number
): Promise<FootballPredictionMatch[]> {
  const data = await fetchJson<unknown>(
    footballPredictionEndpoints.predictionById(id),
    "prediction-details"
  );
  const list = unwrapData<unknown[]>(data);
  if (!Array.isArray(list)) {
    const single = normalizePredictionMatch(unwrapData(data));
    return single ? [single] : [];
  }
  return list.map(normalizePredictionMatch).filter((m): m is FootballPredictionMatch => m !== null);
}

export async function fetchFixtureIds(opts?: {
  date?: string;
  federation?: FootballPredictionFederation;
  market?: FootballPredictionMarket;
}): Promise<number[]> {
  const data = await fetchJson<unknown>(
    footballPredictionEndpoints.fixtureIds({
      iso_date: opts?.date,
      federation: opts?.federation,
      market: opts?.market,
    }),
    "fixture-ids"
  );
  const list = unwrapData<unknown[]>(data);
  if (!Array.isArray(list)) return [];
  return list
    .map((id) => (typeof id === "number" ? id : Number(id)))
    .filter((id) => Number.isFinite(id));
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
