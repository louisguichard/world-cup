import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { zafronixEndpoints, ZAFRONIX_HOST } from "../config/zafronixEndpoints";
import { logger } from "./Logger";

const ZAFRONIX_RAPIDAPI_HOST = providerByHost(ZAFRONIX_HOST)?.host ?? ZAFRONIX_HOST;

let zafronixSessionDisabled = false;

export function isZafronixDisabled(): boolean {
  return zafronixSessionDisabled;
}

export type ZafronixMatch = {
  id: string | number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  date: string;
  competition?: string;
  isWorldCup?: boolean;
};

export type ZafronixTournament = {
  id: string | number;
  name: string;
  year: number;
  teams?: string[];
};

export type ZafronixTeamProfile = {
  name?: string;
  shortName?: string;
  abbreviation?: string;
  code?: string;
  logo?: string;
  crest?: string;
  crestUrl?: string;
  flag?: string;
  image?: string;
  group?: string;
  fifaRank?: number;
  matches?: ZafronixMatch[];
  recentMatches?: ZafronixMatch[];
};

export type ZafronixMatchResultPayload = {
  homeScore: number;
  awayScore: number;
  extraTime?: boolean;
  penalties?: { home: number; away: number };
  attendance?: number;
  referee?: { name: string; country: string };
  finalizedAt?: string;
};

export type ZafronixMatchPostponePayload = {
  newDate?: string;
  reason?: string;
};

type FetchOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
};

function baseUrl(): string {
  if (typeof window !== "undefined") return "/api/zafronix";
  return `https://${ZAFRONIX_RAPIDAPI_HOST}`;
}

function zafronixHeaders(method: FetchOptions["method"] = "GET"): HeadersInit {
  const headers = rapidApiHeaders(ZAFRONIX_RAPIDAPI_HOST) as Record<string, string>;
  const zafronixKey = import.meta.env.VITE_ZAFRONIX_API_KEY;
  if (zafronixKey) {
    headers["X-API-Key"] = zafronixKey;
  }
  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

function unwrapList<T>(data: T[] | { matches?: T[]; teams?: T[]; players?: T[]; stadiums?: T[] } | null, key?: "matches" | "teams" | "players" | "stadiums"): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data[key])) return data[key]!;
  return [];
}

async function fetchApi<T>(path: string, options: FetchOptions = {}): Promise<T | null> {
  if (!isApiEnabled("zafronix") || zafronixSessionDisabled) return null;

  const method = options.method ?? "GET";

  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: zafronixHeaders(method),
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      zafronixSessionDisabled = true;
      const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => "");
      logger.warn(`Zafronix blocked for session (${path})`, "ZafronixClient", {
        status: res.status,
        bodySnippet,
      });
      return null;
    }

    if (!res.ok) {
      logger.warn(`Zafronix non-OK response (${path})`, "ZafronixClient", { status: res.status });
      return null;
    }

    return (await res.json()) as T;
  } catch (error) {
    logger.warn(`Zafronix fetch failed (${path})`, "ZafronixClient", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ── Meta ─────────────────────────────────────────────────────────────────────

/** GET /health */
export async function fetchHealth(): Promise<unknown> {
  return fetchApi(zafronixEndpoints.health());
}

/** GET / — API metadata / welcome payload. */
export async function fetchMeta(): Promise<unknown> {
  return fetchApi(zafronixEndpoints.meta());
}

/** Returns true when GET /health succeeds. */
export async function healthCheck(): Promise<boolean> {
  const data = await fetchHealth();
  return data !== null;
}

// ── Tournaments ──────────────────────────────────────────────────────────────

/** GET /tournaments */
export async function listTournaments(): Promise<ZafronixTournament[]> {
  const data = await fetchApi<ZafronixTournament[] | { tournaments?: ZafronixTournament[] }>(
    zafronixEndpoints.listTournaments()
  );
  if (!data) return [];
  return Array.isArray(data) ? data : (data.tournaments ?? []);
}

/** GET /tournaments/{year} */
export async function getTournament(year: number): Promise<ZafronixTournament | null> {
  return fetchApi<ZafronixTournament>(zafronixEndpoints.tournament(year));
}

// ── Teams ────────────────────────────────────────────────────────────────────

/** GET /teams */
export async function fetchTeamsList(): Promise<ZafronixTeamProfile[]> {
  const data = await fetchApi<ZafronixTeamProfile[] | { teams?: ZafronixTeamProfile[] }>(
    zafronixEndpoints.teams()
  );
  return unwrapList(data, "teams");
}

/** GET /teams/{name} */
export async function fetchTeamProfile(teamName: string): Promise<ZafronixTeamProfile | null> {
  return fetchApi<ZafronixTeamProfile>(zafronixEndpoints.team(teamName));
}

const TEAM_FETCH_CONCURRENCY = 8;

/** Fetches all tournament team profiles (list endpoint, then per-team fallback). */
export async function fetchAllTeams(): Promise<ZafronixTeamProfile[]> {
  const fromList = await fetchTeamsList();
  if (fromList.length > 0) return fromList;

  const tournament = await getTournament(2026);
  const names = tournament?.teams ?? [];
  if (names.length === 0) return [];

  const results: ZafronixTeamProfile[] = [];
  for (let i = 0; i < names.length; i += TEAM_FETCH_CONCURRENCY) {
    const batch = names.slice(i, i + TEAM_FETCH_CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((name) => fetchTeamProfile(name)));
    for (const entry of settled) {
      if (entry.status === "fulfilled" && entry.value) {
        results.push(entry.value);
      }
    }
  }
  return results;
}

/** GET /teams/{name}/roster */
export async function fetchTeamRoster(teamName: string, year = 2026): Promise<unknown> {
  return fetchApi(zafronixEndpoints.teamRoster(teamName, year));
}

/** Fetches recent form matches for a team. */
export async function fetchTeamForm(teamName: string, limit = 7): Promise<ZafronixMatch[]> {
  return getHistoricalMatchesForTeam(teamName, limit);
}

export async function getHistoricalMatchesForTeam(
  teamName: string,
  limit = 7
): Promise<ZafronixMatch[]> {
  const profile = await fetchTeamProfile(teamName);
  if (profile?.matches?.length) return profile.matches.slice(0, limit);
  if (profile?.recentMatches?.length) return profile.recentMatches.slice(0, limit);

  const data = await fetchApi<ZafronixMatch[] | { matches?: ZafronixMatch[] }>(
    zafronixEndpoints.matches({ limit: limit * 4 })
  );
  const list = unwrapList(data, "matches");
  const lower = teamName.toLowerCase();
  return list
    .filter(
      (m) =>
        m.homeTeam.toLowerCase().includes(lower) || m.awayTeam.toLowerCase().includes(lower)
    )
    .slice(0, limit);
}

// ── Matches ──────────────────────────────────────────────────────────────────

/** GET /matches */
export async function fetchMatches(query?: Record<string, string | number>): Promise<ZafronixMatch[]> {
  const data = await fetchApi<ZafronixMatch[] | { matches?: ZafronixMatch[] }>(
    zafronixEndpoints.matches(query)
  );
  return unwrapList(data, "matches");
}

/** GET /matches/live */
export async function fetchLiveMatches(): Promise<ZafronixMatch[]> {
  const data = await fetchApi<ZafronixMatch[] | { matches?: ZafronixMatch[] }>(
    zafronixEndpoints.matchesLive()
  );
  return unwrapList(data, "matches");
}

/** GET /matches/{matchId} */
export async function fetchMatch(matchId: string): Promise<unknown> {
  return fetchApi(zafronixEndpoints.match(matchId));
}

/** GET /matches/{matchId}/history */
export async function fetchMatchHistory(matchId: string): Promise<ZafronixMatch[]> {
  const data = await fetchApi<ZafronixMatch[] | { matches?: ZafronixMatch[]; history?: ZafronixMatch[] }>(
    zafronixEndpoints.matchHistory(matchId)
  );
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.history)) return data.history;
  return unwrapList(data, "matches");
}

// ── Match writes (admin / sandbox) ───────────────────────────────────────────

/** POST /matches/{matchId}/result */
export async function postMatchResult(
  matchId: string,
  payload: ZafronixMatchResultPayload
): Promise<unknown> {
  return fetchApi(zafronixEndpoints.matchResult(matchId), { method: "POST", body: payload });
}

/** PATCH /matches/{matchId}/result */
export async function patchMatchResult(
  matchId: string,
  payload: Partial<ZafronixMatchResultPayload>
): Promise<unknown> {
  return fetchApi(zafronixEndpoints.matchResult(matchId), { method: "PATCH", body: payload });
}

/** POST /matches/{matchId}/postpone */
export async function postMatchPostpone(
  matchId: string,
  payload: ZafronixMatchPostponePayload
): Promise<unknown> {
  return fetchApi(zafronixEndpoints.matchPostpone(matchId), { method: "POST", body: payload });
}

// ── Computed ─────────────────────────────────────────────────────────────────

/** GET /bracket?year= */
export async function fetchBracket(year = 2026): Promise<unknown> {
  return fetchApi(zafronixEndpoints.bracket(year));
}

/** GET /standings?year= */
export async function fetchStandings(year = 2026): Promise<unknown> {
  return fetchApi(zafronixEndpoints.standings(year));
}

// ── Players ──────────────────────────────────────────────────────────────────

/** GET /players */
export async function fetchPlayers(query?: Record<string, string | number>): Promise<unknown[]> {
  const data = await fetchApi<unknown[] | { players?: unknown[] }>(zafronixEndpoints.players(query));
  return unwrapList(data, "players");
}

/** GET /players/{name} */
export async function fetchPlayer(name: string): Promise<unknown> {
  return fetchApi(zafronixEndpoints.player(name));
}

// ── Stadiums ─────────────────────────────────────────────────────────────────

/** GET /stadiums */
export async function fetchStadiums(): Promise<unknown[]> {
  const data = await fetchApi<unknown[] | { stadiums?: unknown[] }>(zafronixEndpoints.stadiums());
  return unwrapList(data, "stadiums");
}

/** GET /stadiums/{id} */
export async function fetchStadium(id: string): Promise<unknown> {
  return fetchApi(zafronixEndpoints.stadium(id));
}

// ── Other ────────────────────────────────────────────────────────────────────

/** GET /compare?team1=&team2= (or similar query keys). */
export async function fetchCompare(query: Record<string, string>): Promise<unknown> {
  return fetchApi(zafronixEndpoints.compare(query));
}

/** GET /trivia */
export async function getTrivia(): Promise<unknown> {
  return fetchApi(zafronixEndpoints.trivia());
}

// ── Aggregates ───────────────────────────────────────────────────────────────

/** GET /aggregates/players */
export async function fetchAggregatePlayers(): Promise<unknown> {
  return fetchApi(zafronixEndpoints.aggregatesPlayers());
}

/** GET /aggregates/champions */
export async function fetchAggregateChampions(): Promise<unknown> {
  return fetchApi(zafronixEndpoints.aggregatesChampions());
}

// ── Discovery ────────────────────────────────────────────────────────────────

/** GET /search?q= */
export async function searchZafronix(query: string): Promise<unknown> {
  return fetchApi(zafronixEndpoints.search(query));
}

/** GET /me/usage */
export async function fetchUsage(): Promise<unknown> {
  return fetchApi(zafronixEndpoints.usage());
}

/** GET /sandbox */
export async function fetchSandbox(): Promise<unknown> {
  return fetchApi(zafronixEndpoints.sandbox());
}

/** Test-only reset */
export function resetZafronixSessionForTests(): void {
  zafronixSessionDisabled = false;
}
