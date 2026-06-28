import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { isApiEnabled } from "../config/apiFlags";
import {
  TODAY_FOOTBALL_PREDICTION_HOST,
  todayFootballPredictionEndpoints,
  type TodayFootballPredictionMarket,
} from "../config/todayFootballPredictionEndpoints";
import type {
  FootballPredictionLeague,
  FootballPredictionMatch,
  FootballPredictionPerformance,
} from "./FootballPredictionClient";
import {
  normalizeLeagues,
  normalizePerformanceStats,
  normalizePredictionMatch,
} from "./FootballPredictionClient";
import { logger } from "./Logger";

let sessionDisabled = false;

export function isTodayFootballPredictionDisabled(): boolean {
  return sessionDisabled;
}

export function resetTodayFootballPredictionSessionForTests(): void {
  sessionDisabled = false;
}

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${TODAY_FOOTBALL_PREDICTION_HOST}`;
  }
  return "/api/today-football-prediction";
}

function headers(): HeadersInit {
  return rapidApiHeaders(
    providerByHost(TODAY_FOOTBALL_PREDICTION_HOST)?.host ?? TODAY_FOOTBALL_PREDICTION_HOST
  );
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function tagTodaySource(match: FootballPredictionMatch): FootballPredictionMatch {
  return { ...match, source: "today" };
}

async function fetchJson<T = unknown>(path: string, context: string): Promise<T | null> {
  if (sessionDisabled || !isApiEnabled("todayFootballPrediction")) return null;

  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: headers() });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      if (res.status === 429) sessionDisabled = true;
      logger.warn(`TodayFootballPrediction ${context} blocked`, "TodayFootballPredictionClient", {
        status: res.status,
      });
      return null;
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      logger.warn(`TodayFootballPrediction ${context} failed`, "TodayFootballPredictionClient", {
        status: res.status,
        path,
      });
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    logger.warn(`TodayFootballPrediction ${context} error`, "TodayFootballPredictionClient", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function normalizeTodayLeagues(raw: unknown): FootballPredictionLeague[] {
  const list = isRecord(raw) && Array.isArray(raw.leagues) ? raw.leagues : [];
  return normalizeLeagues({ leagues: list });
}

function normalizeTodayMatches(raw: unknown): FootballPredictionMatch[] {
  if (!isRecord(raw)) return [];
  const list = Array.isArray(raw.matches) ? raw.matches : [];
  return list
    .map(normalizePredictionMatch)
    .filter((m): m is FootballPredictionMatch => m !== null)
    .map(tagTodaySource);
}

export async function fetchTodayLeagues(): Promise<FootballPredictionLeague[]> {
  const data = await fetchJson<unknown>(todayFootballPredictionEndpoints.leagues(), "leagues");
  return normalizeTodayLeagues(data);
}

export async function fetchTodayPerformanceStats(): Promise<FootballPredictionPerformance | null> {
  const data = await fetchJson<unknown>(
    todayFootballPredictionEndpoints.performanceStats(),
    "performance-stats"
  );
  return normalizePerformanceStats(data);
}

export async function fetchTodayDailyPredictionsPage(
  page = 1,
  opts?: { date?: string; market?: TodayFootballPredictionMarket; league?: string }
): Promise<{ matches: FootballPredictionMatch[]; totalPages: number; total: number }> {
  const data = await fetchJson<unknown>(
    todayFootballPredictionEndpoints.dailyPredictions({ page, ...opts }),
    "daily-predictions"
  );
  if (!isRecord(data)) return { matches: [], totalPages: 0, total: 0 };

  const pagination = isRecord(data.pagination) ? data.pagination : {};
  const total = num(pagination.no_of_docs_total) ?? 0;
  const pageSize = num(pagination.no_of_docs_in_page) ?? 25;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  const matches = normalizeTodayMatches(data);

  return { matches, totalPages, total };
}

export async function fetchTodayVipFeatured(page = 1): Promise<FootballPredictionMatch[]> {
  const data = await fetchJson<unknown>(
    todayFootballPredictionEndpoints.vipFeatured(page),
    "vip-featured"
  );
  return normalizeTodayMatches(data).map((m) => ({ ...m, vipTier: "featured" as const }));
}

export async function fetchTodayVipScores(page = 1): Promise<FootballPredictionMatch[]> {
  const data = await fetchJson<unknown>(
    todayFootballPredictionEndpoints.vipScores(page),
    "vip-scores"
  );
  return normalizeTodayMatches(data).map((m) => ({ ...m, vipTier: "scores" as const }));
}

export async function fetchTodayPredictionDetails(
  id: string | number
): Promise<FootballPredictionMatch | null> {
  const data = await fetchJson<unknown>(
    todayFootballPredictionEndpoints.predictionDetails(id),
    "prediction-details"
  );
  const match = normalizePredictionMatch(data);
  return match ? tagTodaySource(match) : null;
}
