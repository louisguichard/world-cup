import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import {
  canSpendHighlightlyRequests,
  recordHighlightlyRequests,
} from "../lib/highlightlyQuota";
import {
  readCachedTeamId,
  writeCachedTeamId,
} from "../lib/highlightlyStaticCache";
import {
  HIGHLIGHTLY_WC_LEAGUE_ID,
  HIGHLIGHTLY_WC_SEASON,
  SPORT_HIGHLIGHTS_HOST,
  sportHighlightsEndpoints,
} from "../config/sportHighlightsEndpoints";
import type {
  HighlightlyCountry,
  HighlightlyHighlight,
  HighlightlyLeagueRef,
  HighlightlyLineups,
  HighlightlyMatch,
  HighlightlyMatchDetail,
  HighlightlyMatchEvent,
  HighlightlyPaginated,
  HighlightlyTeamRef,
  HighlightlyTeamSeasonStats,
  HighlightlyTeamStats,
} from "../types/sportHighlights";
import { logger } from "./Logger";

const RAPIDAPI_HOST =
  providerByHost(SPORT_HIGHLIGHTS_HOST)?.host ?? SPORT_HIGHLIGHTS_HOST;

let sessionDisabled = false;
const teamIdMemoryCache = new Map<string, number>();

export function isSportHighlightsDisabled(): boolean {
  return sessionDisabled || !isApiEnabled("sportHighlights");
}

function baseUrl(): string {
  if (typeof window === "undefined") return `https://${RAPIDAPI_HOST}`;
  return "/api/sport-highlights";
}

function headers(): HeadersInit {
  return rapidApiHeaders(RAPIDAPI_HOST);
}

async function fetchJson<T>(path: string, opts?: { skipQuota?: boolean }): Promise<T | null> {
  if (isSportHighlightsDisabled()) return null;
  if (!opts?.skipQuota && !canSpendHighlightlyRequests(1)) {
    logger.warn("SportHighlights", `Monthly quota reached — skipped ${path}`);
    return null;
  }

  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: headers() });
    if (!opts?.skipQuota) recordHighlightlyRequests(1);

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      sessionDisabled = true;
      logger.warn("SportHighlights", `Blocked ${res.status} on ${path}`);
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    logger.warn("SportHighlights", `Fetch failed ${path}: ${String(err)}`);
    return null;
  }
}

function unwrapList<T>(raw: T[] | HighlightlyPaginated<T> | null): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.data ?? [];
}

function unwrapDetail<T>(raw: T | T[] | null): T | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function normalizeTeamSearchName(name: string): string {
  return name.trim().toLowerCase();
}

/** Lookup Highlightly team id by display name (cached). */
export async function resolveHighlightlyTeamId(teamName: string): Promise<number | null> {
  const key = normalizeTeamSearchName(teamName);
  const mem = teamIdMemoryCache.get(key);
  if (mem != null) return mem;

  const persisted = readCachedTeamId(teamName);
  if (persisted != null) {
    teamIdMemoryCache.set(key, persisted);
    return persisted;
  }

  const payload = await fetchJson<HighlightlyPaginated<HighlightlyTeamRef>>(
    sportHighlightsEndpoints.teams({ name: teamName, limit: 5 })
  );
  const list = unwrapList(payload);
  const exact = list.find((t) => normalizeTeamSearchName(t.name) === key);
  const pick = exact ?? list[0];
  if (pick?.id) {
    teamIdMemoryCache.set(key, pick.id);
    writeCachedTeamId(teamName, pick.id);
    return pick.id;
  }
  return null;
}

function matchDateYmd(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function teamsMatchFixture(
  m: HighlightlyMatch,
  homeName: string,
  awayName: string
): boolean {
  const home = normalizeTeamSearchName(m.homeTeam.name);
  const away = normalizeTeamSearchName(m.awayTeam.name);
  const wantHome = normalizeTeamSearchName(homeName);
  const wantAway = normalizeTeamSearchName(awayName);
  return (
    (home === wantHome && away === wantAway) ||
    (home === wantAway && away === wantHome)
  );
}

/** Resolve Highlightly match id from fixture metadata. */
export async function resolveHighlightlyMatchId(input: {
  homeTeamName: string;
  awayTeamName: string;
  date: string;
  leagueId?: number;
  season?: number;
}): Promise<number | null> {
  const ymd = matchDateYmd(input.date);
  const leagueId = input.leagueId ?? HIGHLIGHTLY_WC_LEAGUE_ID;
  const season = input.season ?? HIGHLIGHTLY_WC_SEASON;

  const byNames = await fetchJson<HighlightlyPaginated<HighlightlyMatch>>(
    sportHighlightsEndpoints.matches({
      leagueId,
      season,
      homeTeamName: input.homeTeamName,
      awayTeamName: input.awayTeamName,
      date: ymd,
      limit: 5,
    })
  );
  const named = unwrapList(byNames).find((m) =>
    teamsMatchFixture(m, input.homeTeamName, input.awayTeamName)
  );
  if (named?.id) return named.id;

  const [homeId, awayId] = await Promise.all([
    resolveHighlightlyTeamId(input.homeTeamName),
    resolveHighlightlyTeamId(input.awayTeamName),
  ]);
  if (homeId && awayId) {
    const byIds = await fetchJson<HighlightlyPaginated<HighlightlyMatch>>(
      sportHighlightsEndpoints.matches({
        leagueId,
        season,
        homeTeamId: homeId,
        awayTeamId: awayId,
        date: ymd,
        limit: 5,
      })
    );
    const idMatch = unwrapList(byIds)[0];
    if (idMatch?.id) return idMatch.id;
  }

  const leagueDay = await fetchJson<HighlightlyPaginated<HighlightlyMatch>>(
    sportHighlightsEndpoints.matches({ leagueId, season, date: ymd, limit: 100 })
  );
  const dayMatch = unwrapList(leagueDay).find((m) =>
    teamsMatchFixture(m, input.homeTeamName, input.awayTeamName)
  );
  return dayMatch?.id ?? null;
}

export async function fetchHighlightlyCountries(): Promise<HighlightlyCountry[]> {
  return unwrapList(await fetchJson<HighlightlyCountry[] | HighlightlyPaginated<HighlightlyCountry>>(
    sportHighlightsEndpoints.countries()
  ));
}

export async function fetchHighlightlyCountry(code: string): Promise<HighlightlyCountry | null> {
  return unwrapDetail(await fetchJson<HighlightlyCountry | HighlightlyCountry[]>(
    sportHighlightsEndpoints.country(code)
  ));
}

export async function fetchHighlightlyLeagues(
  query?: Record<string, string | number>
): Promise<HighlightlyLeagueRef[]> {
  return unwrapList(
    await fetchJson<HighlightlyPaginated<HighlightlyLeagueRef>>(
      sportHighlightsEndpoints.leagues(query)
    )
  );
}

export async function fetchHighlightlyLeague(id: number | string): Promise<HighlightlyLeagueRef | null> {
  return unwrapDetail(
    await fetchJson<HighlightlyLeagueRef | HighlightlyLeagueRef[]>(
      sportHighlightsEndpoints.league(id)
    )
  );
}

export async function fetchHighlightlyTeams(
  query?: Record<string, string | number>
): Promise<HighlightlyTeamRef[]> {
  return unwrapList(
    await fetchJson<HighlightlyPaginated<HighlightlyTeamRef>>(
      sportHighlightsEndpoints.teams(query)
    )
  );
}

export async function fetchHighlightlyTeam(id: number | string): Promise<HighlightlyTeamRef | null> {
  return unwrapDetail(
    await fetchJson<HighlightlyTeamRef | HighlightlyTeamRef[]>(
      sportHighlightsEndpoints.team(id)
    )
  );
}

export async function fetchHighlightlyTeamStatistics(
  teamId: number | string,
  fromDate: string
): Promise<HighlightlyTeamSeasonStats[]> {
  const raw = await fetchJson<HighlightlyTeamSeasonStats[]>(
    sportHighlightsEndpoints.teamStatistics(teamId, { fromDate })
  );
  return raw ?? [];
}

export async function fetchHighlightlyMatches(
  query?: Record<string, string | number>
): Promise<HighlightlyMatch[]> {
  return unwrapList(
    await fetchJson<HighlightlyPaginated<HighlightlyMatch>>(
      sportHighlightsEndpoints.matches(query)
    )
  );
}

export async function fetchHighlightlyMatch(id: number | string): Promise<HighlightlyMatchDetail | null> {
  return unwrapDetail(
    await fetchJson<HighlightlyMatchDetail | HighlightlyMatchDetail[]>(
      sportHighlightsEndpoints.match(id)
    )
  );
}

export async function fetchHighlightlyHighlights(
  query?: Record<string, string | number>
): Promise<HighlightlyHighlight[]> {
  return unwrapList(
    await fetchJson<HighlightlyPaginated<HighlightlyHighlight>>(
      sportHighlightsEndpoints.highlights(query)
    )
  );
}

export async function fetchHighlightlyHighlight(id: number | string): Promise<HighlightlyHighlight | null> {
  return unwrapDetail(
    await fetchJson<HighlightlyHighlight | HighlightlyHighlight[]>(
      sportHighlightsEndpoints.highlight(id)
    )
  );
}

export async function fetchHighlightlyHighlightGeoRestrictions(id: number | string) {
  return fetchJson<{ state?: string; allowedCountries?: string[]; blockedCountries?: string[]; embeddable?: boolean }>(
    sportHighlightsEndpoints.highlightGeoRestrictions(id)
  );
}

export async function fetchHighlightlyBookmakers(query?: Record<string, string | number>) {
  return unwrapList(
    await fetchJson<HighlightlyPaginated<{ id: number; name: string }>>(
      sportHighlightsEndpoints.bookmakers(query)
    )
  );
}

export async function fetchHighlightlyBookmaker(id: number | string) {
  return unwrapDetail(
    await fetchJson<{ id: number; name: string } | Array<{ id: number; name: string }>>(
      sportHighlightsEndpoints.bookmaker(id)
    )
  );
}

export async function fetchHighlightlyOdds(query?: Record<string, string | number>) {
  return fetchJson<unknown>(sportHighlightsEndpoints.odds(query));
}

export async function fetchHighlightlyStandings(query?: Record<string, string | number>) {
  return fetchJson<unknown>(sportHighlightsEndpoints.standings(query));
}

export async function fetchHighlightlyLastFiveGames(teamId: number | string): Promise<HighlightlyMatch[]> {
  const raw = await fetchJson<HighlightlyMatch[]>(
    sportHighlightsEndpoints.lastFiveGames(teamId)
  );
  return raw ?? [];
}

export async function fetchHighlightlyHead2Head(
  teamIdOne: number | string,
  teamIdTwo: number | string
): Promise<HighlightlyMatch[]> {
  const raw = await fetchJson<HighlightlyMatch[]>(
    sportHighlightsEndpoints.head2Head(teamIdOne, teamIdTwo)
  );
  return raw ?? [];
}

export async function fetchHighlightlyLineups(matchId: number | string): Promise<HighlightlyLineups | null> {
  return fetchJson<HighlightlyLineups>(sportHighlightsEndpoints.lineups(matchId));
}

export async function fetchHighlightlyStatistics(matchId: number | string): Promise<HighlightlyTeamStats[]> {
  const raw = await fetchJson<HighlightlyTeamStats[]>(
    sportHighlightsEndpoints.statistics(matchId)
  );
  return raw ?? [];
}

export async function fetchHighlightlyLiveEvents(matchId: number | string): Promise<HighlightlyMatchEvent[]> {
  const raw = await fetchJson<HighlightlyMatchEvent[]>(
    sportHighlightsEndpoints.liveEvents(matchId)
  );
  return raw ?? [];
}

export async function fetchHighlightlyPlayers(query?: Record<string, string | number>) {
  return unwrapList(
    await fetchJson<HighlightlyPaginated<unknown>>(sportHighlightsEndpoints.players(query))
  );
}

export async function fetchHighlightlyPlayer(id: number | string) {
  return unwrapDetail(await fetchJson<unknown | unknown[]>(sportHighlightsEndpoints.player(id)));
}

export async function fetchHighlightlyPlayerStatistics(
  id: number | string,
  query?: Record<string, string | number>
) {
  return fetchJson<unknown>(sportHighlightsEndpoints.playerStatistics(id, query));
}

export async function fetchHighlightlyBoxScore(matchId: number | string) {
  return fetchJson<unknown>(sportHighlightsEndpoints.boxScore(matchId));
}

export type { HighlightlyCountry, HighlightlyLeagueRef };
