import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { isApiEnabled } from "../config/apiFlags";
import {
  FOOTBALL_PREDICTION_HOST,
  footballPredictionEndpoints,
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

async function fetchJson<T = unknown>(path: string, context: string): Promise<T | null> {
  if (sessionDisabled || !isApiEnabled("footballPrediction")) return null;

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
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function normalizePerformanceMarket(raw: unknown): FootballPredictionPerformanceMarket | null {
  if (!isRecord(raw)) return null;
  return {
    profitLoss: num(raw.profit_loss) ?? 0,
    winningPercentage: num(raw.winning_percentage) ?? 0,
    count: num(raw.count) ?? 0,
    countWon: num(raw.count_won) ?? 0,
    countLost: num(raw.count_lost) ?? 0,
    avgProb: num(raw.avg_prob) ?? 0,
    avgOdd: num(raw.avg_odd) ?? 0,
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
  const date = str(raw.date);
  if (!date) return null;
  return {
    date,
    featured: normalizePerformanceBucket(raw.featured),
    all: normalizePerformanceBucket(raw.all),
  };
}

export function normalizePredictionMatch(raw: unknown): FootballPredictionMatch | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const homeTeam = str(raw.home_team);
  const awayTeam = str(raw.away_team);
  const date = str(raw.date);
  const leagueId = str(raw.league);
  const prediction = str(raw.prediction);
  if (!id || !homeTeam || !awayTeam || !date || !leagueId || !prediction) return null;

  return {
    id,
    homeTeam,
    awayTeam,
    date,
    dateTime: str(raw.date_time),
    leagueId,
    prediction,
    predictionOdd: num(raw.prediction_odd),
    predictionProbability: num(raw.prediction_probability),
    isFinished: raw.is_finished === true,
  };
}

export function normalizeLeagues(raw: unknown): FootballPredictionLeague[] {
  const list = isRecord(raw) && Array.isArray(raw.leagues) ? raw.leagues : [];
  return list
    .filter(isRecord)
    .map((l) => ({
      id: str(l.id) ?? "",
      name: str(l.name) ?? "",
      country: str(l.country) ?? "",
    }))
    .filter((l) => l.id && l.name);
}

export async function fetchLeagues(): Promise<FootballPredictionLeague[]> {
  const data = await fetchJson<unknown>(footballPredictionEndpoints.leagues(), "leagues");
  return normalizeLeagues(data);
}

export async function fetchPerformanceStats(): Promise<FootballPredictionPerformance | null> {
  const data = await fetchJson<unknown>(
    footballPredictionEndpoints.performanceStats(),
    "performance-stats"
  );
  return normalizePerformanceStats(data);
}

export async function fetchDailyPredictionsPage(
  page = 1,
  opts?: { date?: string; market?: FootballPredictionMarket; league?: string }
): Promise<{ matches: FootballPredictionMatch[]; totalPages: number; total: number }> {
  const data = await fetchJson<unknown>(
    footballPredictionEndpoints.dailyPredictions({ page, ...opts }),
    "daily-predictions"
  );
  if (!isRecord(data)) return { matches: [], totalPages: 0, total: 0 };

  const pagination = isRecord(data.pagination) ? data.pagination : {};
  const total = num(pagination.no_of_docs_total) ?? 0;
  const pageSize = num(pagination.no_of_docs_in_page) ?? 25;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  const matches = (Array.isArray(data.matches) ? data.matches : [])
    .map(normalizePredictionMatch)
    .filter((m): m is FootballPredictionMatch => m !== null);

  return { matches, totalPages, total };
}

export async function fetchVipFeatured(page = 1): Promise<FootballPredictionMatch[]> {
  const data = await fetchJson<{ matches?: unknown[] }>(
    footballPredictionEndpoints.vipFeatured(page),
    "vip-featured"
  );
  if (!data?.matches) return [];
  return data.matches.map(normalizePredictionMatch).filter((m): m is FootballPredictionMatch => m !== null);
}

export async function fetchVipScores(page = 1): Promise<FootballPredictionMatch[]> {
  const data = await fetchJson<{ matches?: unknown[] }>(
    footballPredictionEndpoints.vipScores(page),
    "vip-scores"
  );
  if (!data?.matches) return [];
  return data.matches.map(normalizePredictionMatch).filter((m): m is FootballPredictionMatch => m !== null);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
