import type { MergedMatch } from "../types";
import { markProxyDead } from "../lib/proxyHealthMonitor";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { isApiEnabled } from "../config/apiFlags";
import {
  FOOTAPI7_HOST,
  FOOTAPI7_WC_SEASON_ID,
  FOOTAPI7_WC_TOURNAMENT_ID,
  footApi7Endpoints,
} from "../config/footApi7Endpoints";
import { normalizeSportAPI7Match } from "./adapters/normalizeMatch";
import { normalizeFootApi7Groups } from "./adapters/normalizeFootApi7Standings";
import type { GroupStanding } from "../types";
import type { SofaEvent } from "./SofaScore6Client";
import { logger } from "./Logger";

let sessionDisabled = false;

export function isFootApi7Disabled(): boolean {
  return sessionDisabled;
}

export function resetFootApi7SessionForTests(): void {
  sessionDisabled = false;
}

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${FOOTAPI7_HOST}`;
  }
  return "/api/footapi7";
}

function headers(): HeadersInit {
  return rapidApiHeaders(providerByHost(FOOTAPI7_HOST)?.host ?? FOOTAPI7_HOST);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function asSofaEvent(raw: unknown): SofaEvent | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "number") return null;
  const homeTeam = isRecord(raw.homeTeam) ? raw.homeTeam : null;
  const awayTeam = isRecord(raw.awayTeam) ? raw.awayTeam : null;
  if (!homeTeam || !awayTeam) return null;
  if (typeof homeTeam.name !== "string" || typeof awayTeam.name !== "string") return null;

  const status = isRecord(raw.status) ? raw.status : {};
  const homeScore = isRecord(raw.homeScore) ? raw.homeScore : undefined;
  const awayScore = isRecord(raw.awayScore) ? raw.awayScore : undefined;
  const tournament = isRecord(raw.tournament) ? raw.tournament : undefined;
  const uniqueTournament = isRecord(tournament?.uniqueTournament)
    ? tournament.uniqueTournament
    : undefined;

  return {
    id: raw.id,
    startTimestamp:
      typeof raw.startTimestamp === "number"
        ? raw.startTimestamp
        : typeof raw.timestamp === "number"
          ? raw.timestamp
          : 0,
    timestamp: typeof raw.timestamp === "number" ? raw.timestamp : undefined,
    homeTeam: {
      id: typeof homeTeam.id === "number" ? homeTeam.id : 0,
      name: homeTeam.name,
    },
    awayTeam: {
      id: typeof awayTeam.id === "number" ? awayTeam.id : 0,
      name: awayTeam.name,
    },
    status: {
      type: typeof status.type === "string" ? status.type : "notstarted",
      description: typeof status.description === "string" ? status.description : undefined,
    },
    homeScore: homeScore
      ? { current: typeof homeScore.current === "number" ? homeScore.current : undefined }
      : undefined,
    awayScore: awayScore
      ? { current: typeof awayScore.current === "number" ? awayScore.current : undefined }
      : undefined,
    uniqueTournament: uniqueTournament
      ? { id: typeof uniqueTournament.id === "number" ? uniqueTournament.id : undefined }
      : undefined,
  };
}

function extractEvents(payload: unknown): SofaEvent[] {
  const list = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.events)
      ? payload.events
      : [];

  return list.map(asSofaEvent).filter((e): e is SofaEvent => e !== null);
}

function isWorldCupEvent(_event: SofaEvent): boolean {
  return true;
}

function eventOnDate(event: SofaEvent, dateIso: string): boolean {
  const ts = event.startTimestamp || event.timestamp;
  if (!ts) return true;
  return new Date(ts * 1000).toISOString().slice(0, 10) === dateIso;
}

async function fetchJson<T = unknown>(path: string, context: string): Promise<T | null> {
  if (sessionDisabled || !isApiEnabled("footApi7")) return null;

  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: headers() });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      if (res.status === 429) sessionDisabled = true;
      markProxyDead("footapi7", `HTTP ${res.status}`);
      logger.warn(`FootApi7 ${context} blocked`, "FootApi7Client", { status: res.status });
      return null;
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      if (res.status >= 500) markProxyDead("footapi7", `HTTP ${res.status}`);
      logger.warn(`FootApi7 ${context} failed`, "FootApi7Client", { status: res.status, path });
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    logger.warn(`FootApi7 ${context} error`, "FootApi7Client", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function fetchFootApi7Groups(
  tournamentId = FOOTAPI7_WC_TOURNAMENT_ID,
  seasonId = FOOTAPI7_WC_SEASON_ID
): Promise<unknown> {
  return fetchJson(footApi7Endpoints.tournament.groups(tournamentId, seasonId), "groups");
}

export async function fetchFootApi7Standings(
  tournamentId = FOOTAPI7_WC_TOURNAMENT_ID,
  seasonId = FOOTAPI7_WC_SEASON_ID
): Promise<unknown> {
  return fetchJson(footApi7Endpoints.tournament.standings(tournamentId, seasonId), "standings");
}

export async function fetchFootApi7GroupStandings(
  tournamentId = FOOTAPI7_WC_TOURNAMENT_ID,
  seasonId = FOOTAPI7_WC_SEASON_ID
): Promise<GroupStanding[]> {
  const groups = await fetchFootApi7Groups(tournamentId, seasonId);
  const fromGroups = normalizeFootApi7Groups(groups);
  if (fromGroups.length > 0) return fromGroups;

  const standings = await fetchFootApi7Standings(tournamentId, seasonId);
  return normalizeFootApi7Groups(standings);
}

export async function fetchFootApi7Teams(
  tournamentId = FOOTAPI7_WC_TOURNAMENT_ID,
  seasonId = FOOTAPI7_WC_SEASON_ID
): Promise<unknown> {
  return fetchJson(footApi7Endpoints.tournament.teams(tournamentId, seasonId), "teams");
}

export async function fetchFootApi7Rounds(
  tournamentId = FOOTAPI7_WC_TOURNAMENT_ID,
  seasonId = FOOTAPI7_WC_SEASON_ID
): Promise<unknown> {
  return fetchJson(footApi7Endpoints.tournament.rounds(tournamentId, seasonId), "rounds");
}

export async function fetchFootApi7Knockout(
  tournamentId = FOOTAPI7_WC_TOURNAMENT_ID,
  seasonId = FOOTAPI7_WC_SEASON_ID
): Promise<unknown> {
  return fetchJson(footApi7Endpoints.tournament.knockout(tournamentId, seasonId), "knockout");
}

export async function fetchFootApi7Seasons(tournamentId = FOOTAPI7_WC_TOURNAMENT_ID): Promise<unknown> {
  return fetchJson(footApi7Endpoints.tournaments.seasons(tournamentId), "seasons");
}

export async function fetchFootApi7MatchesByDate(date = todayIsoDate()): Promise<SofaEvent[]> {
  const data = await fetchJson<unknown>(footApi7Endpoints.matches.byDate(date), "matches-by-date");
  return extractEvents(data).filter((e) => isWorldCupEvent(e) && eventOnDate(e, date));
}

export async function fetchFootApi7LiveMatches(): Promise<SofaEvent[]> {
  const data = await fetchJson<unknown>(footApi7Endpoints.matches.live(), "matches-live");
  return extractEvents(data).filter(isWorldCupEvent);
}

export async function fetchFootApi7ScheduledToday(): Promise<SofaEvent[]> {
  const date = todayIsoDate();
  const dated = await fetchFootApi7MatchesByDate(date);
  if (dated.length > 0) return dated;
  return fetchFootApi7LiveMatches();
}

export async function fetchFootApi7LiveEvents(): Promise<Partial<MergedMatch>[]> {
  const events = await fetchFootApi7LiveMatches();
  return events.map((e) => normalizeSportAPI7Match(e));
}

export async function fetchFootApi7Incidents(matchId: number | string): Promise<unknown[]> {
  const data = await fetchJson<{ incidents?: unknown[] } | unknown[]>(
    footApi7Endpoints.match.incidents(matchId),
    "match-incidents"
  );
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.incidents ?? [];
}

export async function fetchFootApi7MatchDetail(matchId: number | string): Promise<unknown> {
  return fetchJson(footApi7Endpoints.match.detail(matchId), "match-detail");
}

export async function fetchFootApi7MatchLineups(matchId: number | string): Promise<unknown> {
  return fetchJson(footApi7Endpoints.match.lineups(matchId), "match-lineups");
}

export async function fetchFootApi7MatchStatistics(matchId: number | string): Promise<unknown> {
  return fetchJson(footApi7Endpoints.match.statistics(matchId), "match-statistics");
}

export async function fetchFootApi7TeamPlayers(teamId: number | string): Promise<unknown> {
  return fetchJson(footApi7Endpoints.team.players(teamId), "team-players");
}

export async function fetchFootApi7Leagues(): Promise<unknown> {
  return fetchJson(footApi7Endpoints.leagues(), "leagues");
}

export async function searchFootApi7(query: string): Promise<unknown> {
  return fetchJson(footApi7Endpoints.search(query), "search");
}

export function mapFootApi7EventToSofaEvent(event: SofaEvent): SofaEvent {
  return event;
}
