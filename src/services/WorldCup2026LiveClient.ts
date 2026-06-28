import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { wcLiveEndpoints } from "../config/wcLiveEndpoints";
import {
  getCachedDrawFixtures,
  isWcLiveDrawStale,
  readWcLiveDrawStore,
  setCachedDrawFixtures,
} from "../lib/wcLiveDrawCache";
import { acquireApiQuota, logApiQuotaBlock } from "./ApiQuotaGovernor";
import { logger } from "./Logger";
import { normalizeWcCommentaryResponse } from "./matchDetail/normalizeWcCommentary";

const RAPIDAPI_HOST =
  providerByHost("world-cup-2026-live-api.p.rapidapi.com")?.host ??
  "world-cup-2026-live-api.p.rapidapi.com";

let wc2026LiveSessionDisabled = false;

export function isWc2026LiveDisabled(): boolean {
  return wc2026LiveSessionDisabled;
}

export type WcDrawFixture = {
  kickoff: string;
  round?: number;
  group?: string;
  home: string;
  away: string;
  matchId: string | null;
  status?: number;
  statusText?: string;
  scoreHome?: number | null;
  scoreAway?: number | null;
};

export type WcLiveMatch = {
  matchId: string;
  id?: string;
  homeTeam?: string;
  awayTeam?: string;
  status?: number;
  minute?: string | number;
  scoreHome?: number;
  scoreAway?: number;
  kickoff?: string;
};

export type WcMatchDetail = {
  matchId: string;
  status?: number;
  kickoff?: string;
  updatedAt?: string;
  sections?: string[];
  referee?: string;
  venue?: string;
  neutralGround?: boolean;
};

export type WcCommentaryEntry = {
  minute?: string | number;
  text: string;
  type?: string;
  period?: string;
  side?: "home" | "away";
  player?: string;
};

export type WcLineupPlayer = {
  id?: string;
  name?: string;
  shortName?: string;
  number?: string | number;
  nationality?: string;
  role?: string | null;
  rating?: number;
  motm?: number;
};

export type WcLineupSide = {
  formation?: string;
  teamRating?: number;
  startingXI?: WcLineupPlayer[];
  substitutes?: WcLineupPlayer[];
  manager?: string;
};

export type WcLineup = {
  matchId?: string;
  formation?: { home?: string; away?: string };
  teamRating?: { home?: number; away?: number };
  startingXI?: { home?: WcLineupPlayer[]; away?: WcLineupPlayer[] };
  substitutes?: { home?: WcLineupPlayer[]; away?: WcLineupPlayer[] };
  coaches?: {
    home?: { name?: string; nationality?: string };
    away?: { name?: string; nationality?: string };
  };
  /** Legacy flat shape */
  homeTeam?: { startingXI?: unknown[]; substitutes?: unknown[]; formation?: string; manager?: string };
  awayTeam?: { startingXI?: unknown[]; substitutes?: unknown[]; formation?: string; manager?: string };
};

export type WcStatRow = { name: string; home: string | number; away: string | number };

export type WcStatsSection = {
  section: string;
  groups: Array<{ group: string; stats: WcStatRow[] }>;
};

export type WcStats = {
  matchId?: string;
  sections?: WcStatsSection[];
  /** Legacy flat shape */
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
  return "/api/wc-live";
}

function rapidHeaders(): HeadersInit {
  return rapidApiHeaders(RAPIDAPI_HOST);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function unwrapData<T>(raw: unknown): T | null {
  if (!isRecord(raw)) return null;
  if ("data" in raw) return raw.data as T;
  return raw as T;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  if (wc2026LiveSessionDisabled || !isApiEnabled("wc2026Live")) return null;
  const intent = path.includes("/live") ? "live" : "background";
  const quota = acquireApiQuota("wc2026Live", intent);
  if (!quota.allowed) {
    logApiQuotaBlock("wc2026Live", intent, quota);
    return null;
  }

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

    if (res.status === 404) return null;

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

function normalizeDrawFixture(raw: unknown): WcDrawFixture | null {
  if (!isRecord(raw)) return null;
  const home = raw.home;
  const away = raw.away;
  const kickoff = raw.kickoff;
  if (typeof home !== "string" || typeof away !== "string" || typeof kickoff !== "string") return null;
  return {
    kickoff,
    round: typeof raw.round === "number" ? raw.round : undefined,
    group: typeof raw.group === "string" ? raw.group : undefined,
    home,
    away,
    matchId: typeof raw.matchId === "string" ? raw.matchId : raw.matchId === null ? null : null,
    status: typeof raw.status === "number" ? raw.status : undefined,
    statusText: typeof raw.statusText === "string" ? raw.statusText : undefined,
    scoreHome: typeof raw.scoreHome === "number" ? raw.scoreHome : null,
    scoreAway: typeof raw.scoreAway === "number" ? raw.scoreAway : null,
  };
}

export async function fetchDraw(stage: "group" | "ko" = "group"): Promise<WcDrawFixture[]> {
  const raw = await fetchJson<{ data?: unknown[] }>(wcLiveEndpoints.draw(stage));
  const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
  const fixtures = list.map(normalizeDrawFixture).filter((f): f is WcDrawFixture => f !== null);

  if (stage === "group" && fixtures.length > 0) {
    const store = readWcLiveDrawStore();
    if (isWcLiveDrawStale(store.lastSyncAt) || store.fixtures.length === 0) {
      setCachedDrawFixtures(fixtures);
    }
  }

  return fixtures;
}

export async function syncWcLiveDrawIfNeeded(): Promise<number> {
  const store = readWcLiveDrawStore();
  if (!isWcLiveDrawStale(store.lastSyncAt) && store.fixtures.length > 0) {
    return store.fixtures.length;
  }
  const fixtures = await fetchDraw("group");
  return fixtures.length || getCachedDrawFixtures().length;
}

function teamLabel(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "object" && v !== null) {
    const name = (v as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return undefined;
}

export async function fetchLive(): Promise<WcLiveMatch[]> {
  const raw = await fetchJson<{ data?: unknown[] }>(wcLiveEndpoints.live());
  const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
  return list
    .filter(isRecord)
    .map((item) => ({
      matchId: String(item.matchId ?? item.id ?? ""),
      id: item.id != null ? String(item.id) : undefined,
      homeTeam: teamLabel(item.homeTeam) ?? teamLabel(item.home),
      awayTeam: teamLabel(item.awayTeam) ?? teamLabel(item.away),
      status: typeof item.status === "number" ? item.status : undefined,
      minute: item.minute as string | number | undefined,
      scoreHome: typeof item.scoreHome === "number" ? item.scoreHome : undefined,
      scoreAway: typeof item.scoreAway === "number" ? item.scoreAway : undefined,
      kickoff: typeof item.kickoff === "string" ? item.kickoff : undefined,
    }))
    .filter((m) => m.matchId.length > 0);
}

function normalizeStandingGroup(raw: unknown): WcStanding | null {
  if (!isRecord(raw)) return null;
  const group = raw.group;
  if (typeof group !== "string") return null;
  const teamsRaw = Array.isArray(raw.teams) ? raw.teams : [];
  const teams = teamsRaw
    .filter(isRecord)
    .map((t) => {
      const goals = typeof t.goals === "string" ? t.goals.split(":") : [];
      const gf = goals[0] ? Number(goals[0]) : 0;
      const ga = goals[1] ? Number(goals[1]) : 0;
      return {
        name: String(t.name ?? ""),
        played: Number(t.played ?? 0),
        won: Number(t.won ?? 0),
        drawn: Number(t.drawn ?? 0),
        lost: Number(t.lost ?? 0),
        gf,
        ga,
        gd: gf - ga,
        points: Number(t.points ?? 0),
      };
    })
    .filter((t) => t.name);
  return { group, teams };
}

export async function fetchStandings(): Promise<WcStanding[]> {
  const raw = await fetchJson<{ data?: unknown[] }>(wcLiveEndpoints.standings());
  const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
  return list.map(normalizeStandingGroup).filter((g): g is WcStanding => g !== null);
}

export async function fetchMatchDetail(id: string): Promise<WcMatchDetail | null> {
  const raw = await fetchJson<unknown>(wcLiveEndpoints.matchDetail(id));
  const data = unwrapData<WcMatchDetail>(raw);
  if (!data || typeof data !== "object") return null;
  return data as WcMatchDetail;
}

export async function fetchCommentary(id: string): Promise<WcCommentaryEntry[]> {
  const raw = await fetchJson<unknown>(wcLiveEndpoints.matchCommentary(id));
  if (!raw) return [];
  return normalizeWcCommentaryResponse(raw);
}

export async function fetchLineups(id: string): Promise<WcLineup | null> {
  const raw = await fetchJson<unknown>(wcLiveEndpoints.matchLineups(id));
  const data = unwrapData<WcLineup>(raw);
  if (!data || typeof data !== "object") return null;
  return { ...(data as WcLineup), matchId: id };
}

export async function fetchStats(id: string): Promise<WcStats | null> {
  const raw = await fetchJson<unknown>(wcLiveEndpoints.matchStats(id));
  if (!raw) return null;
  const data = unwrapData<WcStats>(raw);
  if (Array.isArray(data)) {
    return { matchId: id, sections: data as WcStatsSection[] };
  }
  if (data && typeof data === "object") {
    return { matchId: id, ...(data as WcStats) };
  }
  return null;
}

/** @deprecated Use fetchDraw("ko") */
export async function fetchBracketDraw(): Promise<WcDrawFixture[]> {
  return fetchDraw("ko");
}

export function resetWc2026LiveSessionForTests(): void {
  wc2026LiveSessionDisabled = false;
}
