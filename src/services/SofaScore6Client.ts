import type { MergedMatch, Team } from "../types";
import { markProxyDead } from "../lib/proxyHealthMonitor";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import {
  SOFA_FOOTBALL_SPORT_SLUG,
  SOFA_WC_UNIQUE_TOURNAMENT_ID,
  SOFASCORE6_HOST,
  sofascore6Endpoints,
} from "../config/sofascore6Endpoints";
import { normalizeSportAPI7Match } from "./adapters/normalizeMatch";
import { normalizeSofaScoreTeam } from "./adapters/normalizeTeam";
import { acquireApiQuota, logApiQuotaBlock } from "./ApiQuotaGovernor";
import { logger } from "./Logger";

export type SofaEvent = {
  id: number;
  startTimestamp: number;
  homeTeam: { name: string; id: number };
  awayTeam: { name: string; id: number };
  status: { type: string; description?: string };
  homeScore?: { current?: number };
  awayScore?: { current?: number };
  uniqueTournament?: { id?: number };
  timestamp?: number;
};

export const SOFASCORE6_WC_CATEGORY_ID = 1468;

let sessionDisabled = false;

export function isSofaScore6Disabled(): boolean {
  return sessionDisabled;
}

export function resetSofaScore6SessionForTests(): void {
  sessionDisabled = false;
}

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${SOFASCORE6_HOST}`;
  }
  return "/api/sofascore6";
}

function rapidHeaders(): HeadersInit {
  return rapidApiHeaders(providerByHost(SOFASCORE6_HOST)?.host ?? SOFASCORE6_HOST);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
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
  const uniqueTournament = isRecord(raw.uniqueTournament) ? raw.uniqueTournament : undefined;

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
    homeScore: homeScore ? { current: typeof homeScore.current === "number" ? homeScore.current : undefined } : undefined,
    awayScore: awayScore ? { current: typeof awayScore.current === "number" ? awayScore.current : undefined } : undefined,
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

function isWorldCupEvent(event: SofaEvent): boolean {
  return event.uniqueTournament?.id === SOFA_WC_UNIQUE_TOURNAMENT_ID;
}

function eventOnDate(event: SofaEvent, dateIso: string): boolean {
  const ts = event.startTimestamp || event.timestamp;
  if (!ts) return false;
  return new Date(ts * 1000).toISOString().slice(0, 10) === dateIso;
}

async function fetchJson<T = unknown>(path: string, context: string): Promise<T | null> {
  if (sessionDisabled) return null;
  const intent = context.includes("live") ? "live" : "background";
  const quota = acquireApiQuota("sportApi7", intent);
  if (!quota.allowed) {
    logApiQuotaBlock("sportApi7", intent, quota);
    return null;
  }

  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: rapidHeaders() });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      sessionDisabled = true;
      markProxyDead("sportapi7", `HTTP ${res.status}`);
      const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => "");
      logger.warn(`SofaScore6 blocked for session (${context})`, "SofaScore6Client", {
        status: res.status,
        bodySnippet,
      });
      return null;
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      if (res.status >= 500) {
        markProxyDead("sportapi7", `HTTP ${res.status}`);
      }
      logger.warn(`SofaScore6 ${context} failed`, "SofaScore6Client", { status: res.status, path });
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    logger.warn(`SofaScore6 ${context} error`, "SofaScore6Client", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function mapSofaScore6EventToSofaEvent(event: SofaEvent): SofaEvent {
  return event;
}

export async function fetchLiveEventsRaw(): Promise<SofaEvent[]> {
  const data = await fetchJson<unknown>(
    sofascore6Endpoints.match.live(SOFA_FOOTBALL_SPORT_SLUG),
    "match-live"
  );
  return extractEvents(data);
}

export async function fetchLiveEvents(): Promise<Partial<MergedMatch>[]> {
  const events = await fetchLiveEventsRaw();
  return events.filter(isWorldCupEvent).map((e) => normalizeSportAPI7Match(e));
}

export async function fetchScheduledToday(): Promise<SofaEvent[]> {
  const date = todayIsoDate();

  const byDate = await fetchJson<unknown>(
    sofascore6Endpoints.match.matchesByDate(date),
    "matches-by-date"
  );
  const dated = extractEvents(byDate).filter(
    (e) => isWorldCupEvent(e) && eventOnDate(e, date)
  );
  if (dated.length > 0) return dated;

  const live = await fetchLiveEventsRaw();
  const liveWc = live.filter(isWorldCupEvent);
  if (liveWc.length > 0) return liveWc;

  return [];
}

export async function fetchScheduledEvents(dateISO: string): Promise<Partial<MergedMatch>[]> {
  const byDate = await fetchJson<unknown>(
    sofascore6Endpoints.match.matchesByDate(dateISO),
    "scheduled-events"
  );
  const dated = extractEvents(byDate).filter(
    (e) => isWorldCupEvent(e) && eventOnDate(e, dateISO)
  );
  if (dated.length > 0) {
    return dated.map((e) => normalizeSportAPI7Match(e));
  }

  if (dateISO === todayIsoDate()) {
    return fetchLiveEvents();
  }

  return [];
}

export async function fetchIncidents(eventId: number): Promise<unknown[]> {
  const data = await fetchJson<{ incidents?: unknown[] } | unknown[]>(
    sofascore6Endpoints.match.incidents(eventId),
    "match-incidents"
  );
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.incidents ?? [];
}

export async function fetchEventDetail(eventId: string): Promise<Partial<MergedMatch> | null> {
  const data = await fetchJson<unknown>(sofascore6Endpoints.match.details(eventId), "match-details");
  const event = asSofaEvent(data);
  return event ? normalizeSportAPI7Match(event) : null;
}

export async function fetchTeamDetails(teamId: string): Promise<Partial<Team> | null> {
  const data = await fetchJson<unknown>(sofascore6Endpoints.team.details(teamId), "team-details");
  if (!data) return null;
  return normalizeSofaScoreTeam(data);
}

export async function fetchTeamDetailsRaw(teamId: number | string): Promise<unknown | null> {
  return fetchJson(sofascore6Endpoints.team.details(teamId), "team-details-raw");
}

export async function fetchTeamPlayers(teamId: number | string): Promise<unknown | null> {
  return fetchJson(sofascore6Endpoints.team.players(teamId), "team-players");
}

export async function fetchTeamStatistics(
  teamId: number | string,
  uniqueTournamentId: number | string,
  seasonId: number | string
): Promise<unknown | null> {
  return fetchJson(
    sofascore6Endpoints.team.statistics(teamId, uniqueTournamentId, seasonId),
    "team-statistics"
  );
}

export async function fetchTeamMediaVideos(teamId: number | string): Promise<unknown | null> {
  return fetchJson(sofascore6Endpoints.team.mediaVideos(teamId), "team-media-videos");
}

export async function fetchMatchLineups(matchId: number | string): Promise<unknown | null> {
  return fetchJson(sofascore6Endpoints.match.lineups(matchId), "match-lineups");
}

export async function fetchMatchStatistics(matchId: number | string): Promise<unknown | null> {
  return fetchJson(sofascore6Endpoints.match.statistics(matchId), "match-statistics");
}

export async function fetchMatchComments(matchId: number | string): Promise<unknown[] | null> {
  const data = await fetchJson<unknown[]>(sofascore6Endpoints.match.comments(matchId), "match-comments");
  return data ?? null;
}

export async function fetchMatchOdds(matchId: number | string): Promise<unknown | null> {
  return fetchJson(sofascore6Endpoints.match.odds(matchId), "match-odds");
}

export async function searchAll(query: string): Promise<unknown[] | null> {
  const data = await fetchJson<unknown[]>(sofascore6Endpoints.search.all(query), "search-all");
  return data ?? null;
}

export async function searchTeams(query: string): Promise<unknown[] | null> {
  const data = await fetchJson<unknown[]>(sofascore6Endpoints.search.teams(query), "search-teams");
  return data ?? null;
}

export async function searchMatches(query: string): Promise<unknown[] | null> {
  const data = await fetchJson<unknown[]>(sofascore6Endpoints.search.matches(query), "search-matches");
  return data ?? null;
}

export async function fetchUniqueTournamentDetails(
  uniqueTournamentId = SOFA_WC_UNIQUE_TOURNAMENT_ID
): Promise<unknown | null> {
  return fetchJson(sofascore6Endpoints.uniqueTournament.details(uniqueTournamentId), "ut-details");
}

export async function fetchUniqueTournamentSeasons(
  uniqueTournamentId = SOFA_WC_UNIQUE_TOURNAMENT_ID
): Promise<unknown[] | null> {
  const data = await fetchJson<unknown[]>(
    sofascore6Endpoints.uniqueTournament.seasons(uniqueTournamentId),
    "ut-seasons"
  );
  return data ?? null;
}

export const SOFA_CONDUCT_MAP: Record<string, number> = {
  yellowCard: -1,
  redCard: -4,
  yellowRedCard: -5,
};

export function mergeConductScores(
  existing: { home: number; away: number },
  sofaHome: number | undefined,
  sofaAway: number | undefined
): { home: number; away: number } {
  return {
    home: sofaHome ?? existing.home,
    away: sofaAway ?? existing.away,
  };
}

/** Back-compat aliases used across the codebase */
export const isSofaScoreDisabled = isSofaScore6Disabled;
export const resetSofaScoreSessionForTests = resetSofaScore6SessionForTests;
export const isSportAPI7Disabled = isSofaScore6Disabled;
export const resetSportAPI7SessionForTests = resetSofaScore6SessionForTests;
