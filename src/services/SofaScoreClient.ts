import { logger } from "./Logger";

const BASE = typeof window !== "undefined" ? "/api/sofascore" : "https://api.sofascore.com";
const API_V1 = "/api/v1";

const SOFA_HEADERS: HeadersInit = {
  Accept: "application/json, text/plain, */*",
  Referer: "https://www.sofascore.com/",
  Origin: "https://www.sofascore.com"
};

let sofaScoreSessionDisabled = false;

export function isSofaScoreDisabled(): boolean {
  return sofaScoreSessionDisabled;
}

function proxied(path: string): string {
  if (typeof window === "undefined") return `https://api.sofascore.com${API_V1}${path}`;
  return `${BASE}${path}`;
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export type SofaEvent = {
  id: number;
  startTimestamp: number;
  homeTeam: { name: string; id: number };
  awayTeam: { name: string; id: number };
  status: { type: string; description?: string };
  homeScore?: { current?: number };
  awayScore?: { current?: number };
};

export async function fetchScheduledToday(): Promise<SofaEvent[]> {
  if (sofaScoreSessionDisabled) return [];

  const date = todayUtcDate();
  try {
    const res = await fetch(proxied(`/sport/football/scheduled-events/${date}`), {
      headers: SOFA_HEADERS
    });
    if (res.status === 403 || res.status === 401) {
      sofaScoreSessionDisabled = true;
      logger.warn("SofaScore blocked for session; using ESPN fallback", "SofaScoreClient", {
        status: res.status
      });
      return [];
    }
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    return data?.events ?? [];
  } catch (error) {
    logger.warn("SofaScore fetch failed", "SofaScoreClient", {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

export async function fetchIncidents(sofaEventId: number): Promise<unknown[]> {
  if (sofaScoreSessionDisabled) return [];

  try {
    const res = await fetch(proxied(`/event/${sofaEventId}/incidents`), { headers: SOFA_HEADERS });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    return data?.incidents ?? [];
  } catch {
    return [];
  }
}

export const SOFA_CONDUCT_MAP: Record<string, number> = {
  yellowCard: -1,
  redCard: -4,
  yellowRedCard: -5
};

export function mergeConductScores(
  existing: { home: number; away: number },
  sofaHome: number | undefined,
  sofaAway: number | undefined
): { home: number; away: number } {
  return {
    home: sofaHome ?? existing.home,
    away: sofaAway ?? existing.away
  };
}

/** Test-only reset */
export function resetSofaScoreSessionForTests(): void {
  sofaScoreSessionDisabled = false;
}
