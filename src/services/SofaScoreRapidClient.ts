import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import {
  SOFASCORE_RAPID_HOST,
  sofascoreRapidEndpoints,
} from "../config/sofascoreRapidEndpoints";
import { logger } from "./Logger";

let sessionDisabled = false;

export function isSofaScoreRapidDisabled(): boolean {
  return sessionDisabled;
}

export function resetSofaScoreRapidSessionForTests(): void {
  sessionDisabled = false;
}

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${SOFASCORE_RAPID_HOST}`;
  }
  return "/api/sofascore-rapid";
}

function headers(): HeadersInit {
  return rapidApiHeaders(providerByHost(SOFASCORE_RAPID_HOST)?.host ?? SOFASCORE_RAPID_HOST);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function fetchJson<T = unknown>(path: string, context: string): Promise<T | null> {
  if (sessionDisabled || !isApiEnabled("sofascoreRapid")) return null;

  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: headers() });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      if (res.status === 429) sessionDisabled = true;
      logger.warn(`SofaScoreRapid ${context} blocked`, "SofaScoreRapidClient", {
        status: res.status,
      });
      return null;
    }
    if (res.status === 204 || res.status === 404) return null;
    if (!res.ok) {
      const body = await res.text().then((t) => t.slice(0, 200)).catch(() => "");
      if (body.includes('"code":404')) return null;
      logger.warn(`SofaScoreRapid ${context} failed`, "SofaScoreRapidClient", {
        status: res.status,
        path,
      });
      return null;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) return null;
    return (await res.json()) as T;
  } catch (error) {
    logger.warn(`SofaScoreRapid ${context} error`, "SofaScoreRapidClient", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function fetchTeamDetailRaw(teamId: number | string): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.teams.detail(teamId), "team-detail");
}

export async function fetchTeamSquadRaw(teamId: number | string): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.teams.squad(teamId), "team-squad");
}

export async function fetchTeamStatisticsRaw(
  teamId: number | string,
  tournamentId?: number,
  seasonId?: number
): Promise<unknown | null> {
  return fetchJson(
    sofascoreRapidEndpoints.teams.statistics(teamId, tournamentId, seasonId),
    "team-statistics"
  );
}

export async function fetchTeamRankingsRaw(teamId: number | string): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.teams.rankings(teamId), "team-rankings");
}

export async function fetchTeamLastMatchesRaw(
  teamId: number | string,
  page = 0
): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.teams.lastMatches(teamId, page), "team-last-matches");
}

export async function fetchTeamNextMatchesRaw(
  teamId: number | string,
  page = 0
): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.teams.nextMatches(teamId, page), "team-next-matches");
}

export async function fetchTeamTournamentsRaw(teamId: number | string): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.teams.tournaments(teamId), "team-tournaments");
}

export async function fetchTournamentDetailRaw(
  tournamentId?: number
): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.tournaments.detail(tournamentId), "tournament-detail");
}

export async function fetchTournamentSeasonsRaw(
  tournamentId?: number
): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.tournaments.seasons(tournamentId), "tournament-seasons");
}

export async function fetchTournamentStandingsRaw(
  tournamentId?: number,
  seasonId?: number
): Promise<unknown | null> {
  return fetchJson(
    sofascoreRapidEndpoints.tournaments.standings(tournamentId, seasonId),
    "tournament-standings"
  );
}

export async function fetchTournamentTopPlayersRaw(
  tournamentId?: number,
  seasonId?: number
): Promise<unknown | null> {
  return fetchJson(
    sofascoreRapidEndpoints.tournaments.topPlayers(tournamentId, seasonId),
    "tournament-top-players"
  );
}

export async function fetchTournamentTopTeamsRaw(
  tournamentId?: number,
  seasonId?: number
): Promise<unknown | null> {
  return fetchJson(
    sofascoreRapidEndpoints.tournaments.topTeams(tournamentId, seasonId),
    "tournament-top-teams"
  );
}

export async function fetchTournamentCupTreesRaw(
  tournamentId?: number,
  seasonId?: number
): Promise<unknown | null> {
  return fetchJson(
    sofascoreRapidEndpoints.tournaments.cupTrees(tournamentId, seasonId),
    "tournament-cup-trees"
  );
}

export async function fetchMatchH2hRaw(matchId: number | string): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.matches.h2h(matchId), "match-h2h");
}

export async function fetchMatchH2hEventsRaw(matchId: number | string): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.matches.h2hEvents(matchId), "match-h2h-events");
}

export async function fetchMatchStatisticsRaw(matchId: number | string): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.matches.statistics(matchId), "match-statistics");
}

export async function fetchMatchLineupsRaw(matchId: number | string): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.matches.lineups(matchId), "match-lineups");
}

export async function fetchSearchTeamsRaw(query: string): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.search.query(query, "team"), "search-teams");
}

export async function fetchSportsListRaw(): Promise<unknown | null> {
  return fetchJson(sofascoreRapidEndpoints.sports.list(), "sports-list");
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SofaRapidTeamDuel = {
  homeWins: number;
  awayWins: number;
  draws: number;
};

export function normalizeTeamDuel(raw: unknown): SofaRapidTeamDuel | null {
  if (!isRecord(raw)) return null;
  const duel = isRecord(raw.teamDuel) ? raw.teamDuel : raw;
  if (!isRecord(duel)) return null;
  return {
    homeWins: typeof duel.homeWins === "number" ? duel.homeWins : 0,
    awayWins: typeof duel.awayWins === "number" ? duel.awayWins : 0,
    draws: typeof duel.draws === "number" ? duel.draws : 0,
  };
}

export function normalizeEventsList(raw: unknown): unknown[] {
  if (!isRecord(raw)) return [];
  if (Array.isArray(raw.events)) return raw.events;
  return [];
}
