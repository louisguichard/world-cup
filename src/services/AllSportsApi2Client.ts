import routes from "../../config/allsportsapi2-routes.json";
import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import {
  ALL_SPORTS_API2_HOST,
  ALL_SPORTS_FOOTBALL_SPORT,
  ALL_SPORTS_WC_UNIQUE_TOURNAMENT_ID,
  allSportsApi2Endpoints,
  resolveAllSportsApi2Route,
} from "../config/allSportsApi2Endpoints";
import type {
  AllSportsApi2FootballEvent,
  AllSportsApi2Route,
  AllSportsApi2TennisRankingEntry,
  AllSportsApi2TennisRankings,
} from "../types/allSportsApi2";
import { TtlCache } from "./cache/TtlCache";
import { logger } from "./Logger";

const RAPIDAPI_HOST = providerByHost(ALL_SPORTS_API2_HOST)?.host ?? ALL_SPORTS_API2_HOST;
const DEFAULT_TTL_MS = 5 * 60_000;
const RANKINGS_TTL_MS = 30 * 60_000;

let sessionDisabled = false;
const responseCache = new TtlCache<string, unknown>();

export const ALL_SPORTS_API2_ROUTES = routes as AllSportsApi2Route[];

export function isAllSportsApi2Disabled(): boolean {
  return sessionDisabled || !isApiEnabled("allSportsApi2");
}

function baseUrl(): string {
  if (typeof window === "undefined") return `https://${RAPIDAPI_HOST}`;
  return "/api/allsportsapi2";
}

function headers(): HeadersInit {
  return rapidApiHeaders(RAPIDAPI_HOST);
}

function buildAttribution(path: string): string {
  const when = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `AllSportsAPI2 · ${path} · ${when}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!isRecord(raw)) return [];
  for (const key of ["rankings", "data", "results", "items", "events", "matches"]) {
    const val = raw[key];
    if (Array.isArray(val)) return val;
  }
  return [];
}

async function fetchJson<T>(
  path: string,
  opts?: { ttlMs?: number; cacheKey?: string }
): Promise<T | null> {
  if (isAllSportsApi2Disabled()) return null;

  const cacheKey = opts?.cacheKey ?? path;
  const cached = responseCache.get(cacheKey);
  if (cached != null) return cached as T;

  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: headers() });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      sessionDisabled = true;
      logger.warn("AllSportsApi2", `Blocked ${res.status} on ${path}`);
      return null;
    }
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    responseCache.set(cacheKey, data, opts?.ttlMs ?? DEFAULT_TTL_MS);
    return data;
  } catch (err) {
    logger.warn("AllSportsApi2", `Fetch failed ${path}: ${String(err)}`);
    return null;
  }
}

/** Fetch any documented route template from the 298-endpoint catalog. */
export async function fetchAllSportsApi2Route<T = unknown>(
  template: string,
  params: Record<string, string | number> = {},
  opts?: { ttlMs?: number }
): Promise<T | null> {
  const path = template.includes("{") ? resolveAllSportsApi2Route(template, params) : template;
  return fetchJson<T>(path, { ttlMs: opts?.ttlMs, cacheKey: path });
}

/** List every route exposed on the RapidAPI playground. */
export function listAllSportsApi2Routes(): AllSportsApi2Route[] {
  return ALL_SPORTS_API2_ROUTES;
}

function normalizeTennisRanking(row: unknown): AllSportsApi2TennisRankingEntry | null {
  if (!isRecord(row)) return null;
  const player = isRecord(row.player) ? row.player : isRecord(row.team) ? row.team : row;
  const name =
    (isRecord(player) && typeof player.name === "string" ? player.name : undefined) ??
    (typeof row.name === "string" ? row.name : undefined);
  if (!name && row.ranking == null && row.points == null) return null;
  return {
    id: typeof row.id === "number" ? row.id : undefined,
    ranking: typeof row.ranking === "number" ? row.ranking : typeof row.position === "number" ? row.position : undefined,
    points: typeof row.points === "number" ? row.points : undefined,
    player: isRecord(row.player)
      ? {
          id: typeof row.player.id === "number" ? row.player.id : undefined,
          name: typeof row.player.name === "string" ? row.player.name : undefined,
          shortName: typeof row.player.shortName === "string" ? row.player.shortName : undefined,
        }
      : undefined,
    team: isRecord(row.team)
      ? {
          id: typeof row.team.id === "number" ? row.team.id : undefined,
          name: typeof row.team.name === "string" ? row.team.name : undefined,
          shortName: typeof row.team.shortName === "string" ? row.team.shortName : undefined,
        }
      : undefined,
  };
}

/** GET /api/tennis/rankings/{type} — e.g. atp, wta. */
export async function fetchTennisRankings(type: string): Promise<AllSportsApi2TennisRankings> {
  const path = allSportsApi2Endpoints.tennis.rankings(type);
  const raw = await fetchJson<unknown>(path, { ttlMs: RANKINGS_TTL_MS, cacheKey: path });
  const list = unwrapList(raw).map(normalizeTennisRanking).filter((r): r is AllSportsApi2TennisRankingEntry => r != null);

  return {
    type,
    rankings: list,
    fetchedAt: Date.now(),
    attribution: buildAttribution(path),
    upstreamError: raw == null ? "AllSportsAPI2 request failed or not subscribed" : undefined,
  };
}

export async function fetchTennisAtpRankings(): Promise<AllSportsApi2TennisRankings> {
  return fetchTennisRankings("atp");
}

export async function fetchTennisWtaRankings(): Promise<AllSportsApi2TennisRankings> {
  return fetchTennisRankings("wta");
}

export async function fetchTennisRankingsLive(type: string): Promise<unknown | null> {
  return fetchJson(allSportsApi2Endpoints.tennis.rankingsLive(type), {
    ttlMs: 60_000,
  });
}

export async function searchAllSportsApi2(query: string): Promise<unknown | null> {
  return fetchJson(allSportsApi2Endpoints.searchAll(query));
}

export async function fetchFootballLiveEvents(): Promise<AllSportsApi2FootballEvent[]> {
  const raw = await fetchJson<unknown>(allSportsApi2Endpoints.football.eventsLive(), {
    ttlMs: 30_000,
  });
  return unwrapList(raw) as AllSportsApi2FootballEvent[];
}

export async function fetchFootballEventsByDate(date: Date | string): Promise<AllSportsApi2FootballEvent[]> {
  const d = typeof date === "string" ? new Date(date) : date;
  const path = allSportsApi2Endpoints.football.eventsByDate(
    d.getUTCDate(),
    d.getUTCMonth() + 1,
    d.getUTCFullYear()
  );
  const raw = await fetchJson<unknown>(path);
  return unwrapList(raw) as AllSportsApi2FootballEvent[];
}

export async function fetchFootballEvent(id: number | string): Promise<unknown | null> {
  return fetchJson(allSportsApi2Endpoints.football.event(id));
}

export async function fetchFootballTournamentGroups(
  tournamentId: number | string,
  seasonId: number | string
): Promise<unknown | null> {
  return fetchJson(allSportsApi2Endpoints.football.tournamentSeasonGroups(tournamentId, seasonId));
}

export async function fetchFootballTournamentStandings(
  tournamentId: number | string,
  seasonId: number | string
): Promise<unknown | null> {
  return fetchJson(allSportsApi2Endpoints.football.tournamentSeasonStandingsTotal(tournamentId, seasonId));
}

export async function fetchFootballWorldCupTournament(): Promise<unknown | null> {
  return fetchJson(allSportsApi2Endpoints.football.uniqueTournament(ALL_SPORTS_WC_UNIQUE_TOURNAMENT_ID));
}

export async function fetchBasketballTournaments(): Promise<unknown | null> {
  return fetchJson(allSportsApi2Endpoints.basketball.tournamentAll());
}

export { ALL_SPORTS_FOOTBALL_SPORT, ALL_SPORTS_WC_UNIQUE_TOURNAMENT_ID };
