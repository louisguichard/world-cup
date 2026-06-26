import type { SofaEvent } from "./SofaScoreClient";
import { logger } from "./Logger";

const RAPIDAPI_HOST = "free-api-live-football-data.p.rapidapi.com";

let footballDataSessionDisabled = false;
let loggedIncidentsUnavailable = false;

export function isFootballDataDisabled(): boolean {
  return footballDataSessionDisabled;
}

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${RAPIDAPI_HOST}`;
  }
  if (import.meta.env.DEV) {
    return "/rapidapi";
  }
  return "/api/footballdata";
}

function rapidHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-rapidapi-host": RAPIDAPI_HOST,
  };

  const devKey = import.meta.env.VITE_RAPIDAPI_KEY;
  if (import.meta.env.DEV && devKey) {
    headers["x-rapidapi-key"] = devKey;
  }

  return headers;
}

function todayYyyymmdd(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

type FotMobMatch = {
  id: number;
  timeTS?: number;
  home: { id: number; name: string; score?: number };
  away: { id: number; name: string; score?: number };
  status?: {
    utcTime?: string;
    ongoing?: boolean;
    finished?: boolean;
    liveTime?: { short?: string; long?: string };
    reason?: { short?: string };
  };
};

function mapStatusType(match: FotMobMatch): string {
  if (match.status?.ongoing) return "inprogress";
  if (match.status?.finished) return "finished";
  return "notstarted";
}

export function mapFotMobMatchToSofaEvent(match: FotMobMatch): SofaEvent {
  const startTimestamp = match.timeTS
    ? Math.floor(match.timeTS / 1000)
    : match.status?.utcTime
      ? Math.floor(Date.parse(match.status.utcTime) / 1000)
      : 0;

  return {
    id: match.id,
    startTimestamp,
    homeTeam: { id: match.home.id, name: match.home.name },
    awayTeam: { id: match.away.id, name: match.away.name },
    status: {
      type: mapStatusType(match),
      description: match.status?.liveTime?.short ?? match.status?.reason?.short,
    },
    homeScore: { current: match.home.score },
    awayScore: { current: match.away.score },
  };
}

async function fetchJson(path: string): Promise<Response> {
  return fetch(`${baseUrl()}${path}`, { headers: rapidHeaders() });
}

async function handleBlocked(res: Response, context: string): Promise<boolean> {
  if (res.status !== 401 && res.status !== 403 && res.status !== 429) {
    return false;
  }
  footballDataSessionDisabled = true;
  const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => "");
  logger.warn(`FootballData blocked for session (${context})`, "FootballDataClient", {
    status: res.status,
    bodySnippet,
  });
  return true;
}

function extractMatches(data: unknown): FotMobMatch[] {
  if (!data || typeof data !== "object") return [];
  const response = (data as { response?: { matches?: FotMobMatch[]; live?: FotMobMatch[] } }).response;
  const matches = response?.matches ?? [];
  const live = response?.live ?? [];
  const byId = new Map<number, FotMobMatch>();
  for (const m of matches) byId.set(m.id, m);
  for (const m of live) byId.set(m.id, m);
  return [...byId.values()];
}

export async function fetchScheduledToday(): Promise<SofaEvent[]> {
  if (footballDataSessionDisabled) return [];

  const date = todayYyyymmdd();
  try {
    const [byDateRes, liveRes] = await Promise.all([
      fetchJson(`/football-get-matches-by-date?date=${date}`),
      fetchJson("/football-current-live"),
    ]);

    if (await handleBlocked(byDateRes, "matches-by-date")) return [];
    if (!byDateRes.ok && liveRes.ok === false) {
      if (await handleBlocked(liveRes, "current-live")) return [];
    }

    const payloads: unknown[] = [];
    if (byDateRes.ok) {
      payloads.push(await byDateRes.json());
    }
    if (liveRes.ok) {
      payloads.push(await liveRes.json());
    } else if (await handleBlocked(liveRes, "current-live")) {
      return [];
    }

    const merged = new Map<number, SofaEvent>();
    for (const data of payloads) {
      for (const match of extractMatches(data)) {
        merged.set(match.id, mapFotMobMatchToSofaEvent(match));
      }
    }

    return [...merged.values()];
  } catch (error) {
    logger.warn("FootballData fetch failed", "FootballDataClient", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function fetchIncidents(_eventId: number): Promise<unknown[]> {
  if (!loggedIncidentsUnavailable) {
    loggedIncidentsUnavailable = true;
    logger.warn("FootballData has no incidents endpoint; returning empty", "FootballDataClient");
  }
  return [];
}

/** Test-only reset */
export function resetFootballDataSessionForTests(): void {
  footballDataSessionDisabled = false;
  loggedIncidentsUnavailable = false;
}
