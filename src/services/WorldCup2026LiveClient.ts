import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { logger } from "./Logger";

const RAPIDAPI_HOST =
  providerByHost("world-cup-2026-live-api.p.rapidapi.com")?.host ??
  "world-cup-2026-live-api.p.rapidapi.com";

let wc2026LiveSessionDisabled = false;

export function isWc2026LiveDisabled(): boolean {
  return wc2026LiveSessionDisabled;
}

export type WcLiveMatch = {
  id: string | number;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  minute?: string | number;
  matchId?: string;
};

export type WcMatchDetail = {
  id: string | number;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  venue?: string;
};

export type WcLineup = {
  homeTeam?: { startingXI?: unknown[]; substitutes?: unknown[] };
  awayTeam?: { startingXI?: unknown[]; substitutes?: unknown[] };
};

export type WcCommentaryEntry = {
  minute?: string | number;
  text: string;
  type?: string;
};

export type WcStats = {
  homeTeam?: Record<string, number | string>;
  awayTeam?: Record<string, number | string>;
};

export type WcStanding = {
  group: string;
  teams: Array<{
    name: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    gd: number;
    points: number;
  }>;
};

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${RAPIDAPI_HOST}`;
  }
  if (import.meta.env.DEV) {
    return "/rapidapi-wc-live";
  }
  return "/api/wc-live";
}

function rapidHeaders(): HeadersInit {
  return rapidApiHeaders(RAPIDAPI_HOST);
}

async function fetchJson<T>(path: string): Promise<T | null> {
  if (wc2026LiveSessionDisabled) return null;

  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: rapidHeaders() });

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      wc2026LiveSessionDisabled = true;
      const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => "");
      logger.warn(`WC2026 Live blocked for session (${path})`, "WorldCup2026LiveClient", {
        status: res.status,
        bodySnippet,
      });
      return null;
    }

    if (!res.ok) {
      logger.warn(`WC2026 Live non-OK response (${path})`, "WorldCup2026LiveClient", { status: res.status });
      return null;
    }

    return (await res.json()) as T;
  } catch (error) {
    logger.warn(`WC2026 Live fetch failed (${path})`, "WorldCup2026LiveClient", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function fetchLive(): Promise<WcLiveMatch[]> {
  const data = await fetchJson<WcLiveMatch[] | { matches?: WcLiveMatch[] }>("/wc/live");
  if (!data) return [];
  return Array.isArray(data) ? data : (data.matches ?? []);
}

export async function fetchStandings(): Promise<WcStanding[]> {
  const data = await fetchJson<WcStanding[] | { standings?: WcStanding[] }>("/wc/standings");
  if (!data) return [];
  return Array.isArray(data) ? data : (data.standings ?? []);
}

export async function fetchDraw(): Promise<unknown> {
  return fetchJson("/wc/draw");
}

export async function fetchMatchDetail(id: string | number): Promise<WcMatchDetail | null> {
  return fetchJson<WcMatchDetail>(`/wc/match/${id}`);
}

export async function fetchCommentary(id: string | number): Promise<WcCommentaryEntry[]> {
  const data = await fetchJson<WcCommentaryEntry[] | { commentary?: WcCommentaryEntry[] }>(
    `/wc/commentary/${id}`
  );
  if (!data) return [];
  return Array.isArray(data) ? data : (data.commentary ?? []);
}

export async function fetchLineups(id: string | number): Promise<WcLineup | null> {
  return fetchJson<WcLineup>(`/wc/lineups/${id}`);
}

export async function fetchStats(id: string | number): Promise<WcStats | null> {
  return fetchJson<WcStats>(`/wc/stats/${id}`);
}

/** Alias for fetchDraw — returns bracket draw data. */
export async function fetchBracketDraw(): Promise<unknown> {
  return fetchDraw();
}

/** Test-only reset */
export function resetWc2026LiveSessionForTests(): void {
  wc2026LiveSessionDisabled = false;
}
