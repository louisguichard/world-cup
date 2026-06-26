import { isApiEnabled } from "../config/apiFlags";
import { logger } from "./Logger";

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

function baseUrl(): string {
  if (typeof window === "undefined") {
    return "https://api.zafronix.com";
  }
  if (import.meta.env.DEV) {
    return "/api/zafronix";
  }
  return "/api/zafronix";
}

function zafronixHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const devKey = import.meta.env.VITE_ZAFRONIX_API_KEY;
  if (devKey) {
    headers["X-API-Key"] = devKey;
  }
  return headers;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  if (!isApiEnabled("zafronix") || zafronixSessionDisabled) return null;

  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: zafronixHeaders() });

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

export async function getTournament(year: number): Promise<ZafronixTournament | null> {
  return fetchJson<ZafronixTournament>(`/tournaments/${year}`);
}

export async function getHistoricalMatchesForTeam(
  teamName: string,
  limit = 7
): Promise<ZafronixMatch[]> {
  const encoded = encodeURIComponent(teamName);
  const data = await fetchJson<ZafronixMatch[] | { matches?: ZafronixMatch[] }>(
    `/teams/${encoded}/matches?limit=${limit}`
  );
  if (!data) return [];
  return Array.isArray(data) ? data : (data.matches ?? []);
}

export async function getTrivia(): Promise<unknown> {
  return fetchJson("/trivia/");
}

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
};

/** Fetches a single team profile by name. */
export async function fetchTeamProfile(teamName: string): Promise<ZafronixTeamProfile | null> {
  const encoded = encodeURIComponent(teamName);
  return fetchJson<ZafronixTeamProfile>(`/teams/${encoded}`);
}

const TEAM_FETCH_CONCURRENCY = 8;

/** Fetches all 2026 tournament team profiles (batched). */
export async function fetchAllTeams(): Promise<ZafronixTeamProfile[]> {
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

/** Fetches recent form matches for a team. */
export async function fetchTeamForm(teamName: string, limit = 7): Promise<ZafronixMatch[]> {
  return getHistoricalMatchesForTeam(teamName, limit);
}

/** Fetches team roster for a given year. */
export async function fetchTeamRoster(teamName: string, year = 2026): Promise<unknown> {
  const encoded = encodeURIComponent(teamName);
  return fetchJson(`/teams/${encoded}/roster?year=${year}`);
}

/** Fetches knockout bracket data. */
export async function fetchBracket(year = 2026): Promise<unknown> {
  return fetchJson(`/bracket?year=${year}`);
}

/** Fetches stadium list (best-effort endpoint). */
export async function fetchStadiums(): Promise<unknown[]> {
  const data = await fetchJson<unknown[] | { stadiums?: unknown[] }>("/stadiums");
  if (!data) return [];
  return Array.isArray(data) ? data : (data.stadiums ?? []);
}

/** Fetches live matches from Zafronix. */
export async function fetchLiveMatches(): Promise<ZafronixMatch[]> {
  const data = await fetchJson<ZafronixMatch[] | { matches?: ZafronixMatch[] }>("/matches/live");
  if (!data) return [];
  return Array.isArray(data) ? data : (data.matches ?? []);
}

/** Returns true when the Zafronix API responds successfully. */
export async function healthCheck(): Promise<boolean> {
  const data = await getTournament(2026);
  return data !== null;
}

/** Test-only reset */
export function resetZafronixSessionForTests(): void {
  zafronixSessionDisabled = false;
}
