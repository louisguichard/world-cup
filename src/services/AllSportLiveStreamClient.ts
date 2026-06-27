import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import {
  ALL_SPORT_LIVE_STREAM_HOST,
  LIVE_STREAM_FOOTBALL_SLUG,
  LIVE_STREAM_FOOTBALL_SPORT_ID,
  allSportLiveStreamEndpoints,
} from "../config/allSportLiveStreamEndpoints";
import type {
  LiveStreamPlayResult,
  LiveStreamScheduleMatch,
  LiveStreamScheduleResult,
  LiveStreamServer,
  LiveStreamSport,
} from "../types/liveStream";
import { logger } from "./Logger";

const RAPIDAPI_HOST =
  providerByHost(ALL_SPORT_LIVE_STREAM_HOST)?.host ?? ALL_SPORT_LIVE_STREAM_HOST;

const LEGACY_TIMEOUT_MS = 8_000;

let sessionDisabled = false;

export function isAllSportLiveStreamDisabled(): boolean {
  return sessionDisabled || !isApiEnabled("allSportLiveStream");
}

function baseUrl(): string {
  if (typeof window === "undefined") return `https://${RAPIDAPI_HOST}`;
  return "/api/all-sport-live-stream";
}

function headers(): HeadersInit {
  return rapidApiHeaders(RAPIDAPI_HOST);
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return undefined;
}

function normalizeSport(raw: unknown): LiveStreamSport | null {
  if (!isRecord(raw)) return null;
  const id = raw.id;
  const slug = raw.slug;
  if (typeof id !== "number" || typeof slug !== "string") return null;
  const title = raw.title;
  const name =
    isRecord(title) && typeof title.name === "string"
      ? title.name
      : typeof raw.name === "string"
        ? raw.name
        : slug;
  return { id, slug, name };
}

function normalizeScheduleMatch(raw: unknown): LiveStreamScheduleMatch | null {
  if (!isRecord(raw)) return null;
  const id = raw.id ?? raw.match_id ?? raw.matchId ?? raw.stream_id;
  if (id === undefined || id === null) return null;

  const home =
    pickString(raw, ["home_team_name", "homeTeamName", "home_team", "homeTeam"]) ??
    (isRecord(raw.homeTeam) ? pickString(raw.homeTeam, ["name", "title"]) : undefined) ??
    (isRecord(raw.home) ? pickString(raw.home, ["name", "title"]) : undefined);

  const away =
    pickString(raw, ["away_team_name", "awayTeamName", "away_team", "awayTeam"]) ??
    (isRecord(raw.awayTeam) ? pickString(raw.awayTeam, ["name", "title"]) : undefined) ??
    (isRecord(raw.away) ? pickString(raw.away, ["name", "title"]) : undefined);

  const title =
    pickString(raw, ["title", "name", "match_title", "matchTitle"]) ??
    (home && away ? `${home} vs ${away}` : home ?? away ?? `Match ${String(id)}`);

  const status = pickString(raw, ["match_status", "status", "state", "description"]);
  const league = pickString(raw, ["league_name", "leagueName", "league", "tournament"]);
  const startTime = pickString(raw, ["match_time", "startTime", "start_time", "date", "kickoff"]);

  return {
    id: String(id),
    title,
    homeTeam: home,
    awayTeam: away,
    league,
    startTime,
    status,
    isLive: status?.toLowerCase().includes("live") ?? false,
  };
}

function unwrapSchedulePayload(raw: unknown): { matches: unknown[]; upstreamError?: string } {
  if (Array.isArray(raw)) return { matches: raw };

  if (!isRecord(raw)) return { matches: [] };

  if (Array.isArray(raw.errors) && raw.errors.length > 0) {
    const first = raw.errors[0];
    const message =
      isRecord(first) && typeof first.message === "string"
        ? first.message
        : "Upstream schedule error";
    return { matches: [], upstreamError: message };
  }

  if (typeof raw.error === "string") {
    return { matches: [], upstreamError: raw.error };
  }

  for (const key of ["data", "matches", "results", "items", "schedule"]) {
    const val = raw[key];
    if (Array.isArray(val)) return { matches: val };
  }

  return { matches: [] };
}

function extractServers(raw: Record<string, unknown>): LiveStreamServer[] {
  const servers: LiveStreamServer[] = [];
  const candidates = raw.servers ?? raw.streams ?? raw.sources ?? raw.links;
  if (Array.isArray(candidates)) {
    for (const item of candidates) {
      if (!isRecord(item)) continue;
      const url = pickString(item, ["url", "stream_url", "streamUrl", "link", "embedUrl"]);
      if (url) {
        servers.push({
          url,
          name: pickString(item, ["name", "label", "server"]),
          type: pickString(item, ["type"]),
        });
      }
    }
  }
  return servers;
}

function normalizePlayStream(raw: unknown): LiveStreamPlayResult {
  if (!isRecord(raw)) {
    return { available: false, servers: [], error: "Empty stream response" };
  }

  if (typeof raw.error === "string") {
    return {
      available: false,
      servers: [],
      error: raw.error,
    };
  }

  const servers = extractServers(raw);
  const streamUrl =
    pickString(raw, ["url", "stream_url", "streamUrl", "hls", "m3u8", "link"]) ??
    servers[0]?.url;
  const embedUrl = pickString(raw, ["embedUrl", "embed_url", "iframe_url", "watchUrl"]);
  const iframeHtml = pickString(raw, ["iframe", "iframeHtml", "embed"]);

  return {
    available: Boolean(streamUrl || embedUrl || iframeHtml || servers.length > 0),
    streamUrl,
    embedUrl,
    iframeHtml,
    servers,
  };
}

async function fetchJson<T>(path: string, timeoutMs?: number): Promise<T | null> {
  if (isAllSportLiveStreamDisabled()) return null;

  const controller = timeoutMs ? new AbortController() : undefined;
  const timer =
    controller && timeoutMs
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      headers: headers(),
      signal: controller?.signal,
    });
    if (timer) clearTimeout(timer);

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      sessionDisabled = true;
      logger.warn("AllSportLiveStream", `Blocked ${res.status} on ${path}`);
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    if (timer) clearTimeout(timer);
    if (controller?.signal.aborted) {
      logger.warn("AllSportLiveStream", `Timeout on ${path}`);
    } else {
      logger.warn("AllSportLiveStream", `Fetch failed ${path}: ${String(err)}`);
    }
    return null;
  }
}

/** v5/v6 — All Sport ID */
export async function fetchLiveStreamSports(): Promise<LiveStreamSport[]> {
  const raw = await fetchJson<unknown[]>(allSportLiveStreamEndpoints.sportIdsV6());
  if (!raw) return [];
  return raw.map(normalizeSport).filter((s): s is LiveStreamSport => s != null);
}

/** v5 Schedule / v4 Match List */
export async function fetchLiveStreamSchedule(input?: {
  slug?: string;
  currentDate?: string;
}): Promise<LiveStreamScheduleResult> {
  const slug = input?.slug ?? LIVE_STREAM_FOOTBALL_SLUG;
  const current_date = input?.currentDate ?? todayYmd();
  const raw = await fetchJson<unknown>(
    allSportLiveStreamEndpoints.scheduleV6({ slug, current_date })
  );
  const { matches: list, upstreamError } = unwrapSchedulePayload(raw);
  const matches = list
    .map(normalizeScheduleMatch)
    .filter((m): m is LiveStreamScheduleMatch => m != null);

  return {
    matches,
    upstreamError,
    fetchedAt: Date.now(),
  };
}

/** v5 Play Stream */
export async function fetchLiveStreamPlay(id: string | number): Promise<LiveStreamPlayResult | null> {
  const raw = await fetchJson<unknown>(allSportLiveStreamEndpoints.playStreamV6(id));
  if (!raw) return null;
  return normalizePlayStream(raw);
}

/** v4 Check Stream Availability — same route as play-stream; interprets availability */
export async function checkLiveStreamAvailability(
  id: string | number
): Promise<LiveStreamPlayResult | null> {
  return fetchLiveStreamPlay(id);
}

/** Legacy v1/v2 aggregate — short timeout, optional fallback */
export async function fetchLegacyAllLiveStream(
  version: 1 | 2,
  query?: Record<string, string | number>
): Promise<LiveStreamScheduleMatch[]> {
  const path =
    version === 1
      ? allSportLiveStreamEndpoints.allLiveStreamV1(query)
      : allSportLiveStreamEndpoints.allLiveStreamV2(query);
  const raw = await fetchJson<unknown>(path, LEGACY_TIMEOUT_MS);
  const { matches: list } = unwrapSchedulePayload(raw);
  return list
    .map(normalizeScheduleMatch)
    .filter((m): m is LiveStreamScheduleMatch => m != null);
}

function normalizeTeamKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Find a schedule row for a fixture by team names (fuzzy). */
export function findLiveStreamScheduleMatch(
  schedule: LiveStreamScheduleMatch[],
  homeTeamName: string,
  awayTeamName: string
): LiveStreamScheduleMatch | null {
  const home = normalizeTeamKey(homeTeamName);
  const away = normalizeTeamKey(awayTeamName);

  for (const match of schedule) {
    const title = normalizeTeamKey(match.title);
    const mHome = match.homeTeam ? normalizeTeamKey(match.homeTeam) : "";
    const mAway = match.awayTeam ? normalizeTeamKey(match.awayTeam) : "";

    const titleHit =
      (title.includes(home) && title.includes(away)) ||
      (mHome === home && mAway === away) ||
      (mHome === away && mAway === home);

    if (titleHit) return match;
  }
  return null;
}

export { LIVE_STREAM_FOOTBALL_SLUG, LIVE_STREAM_FOOTBALL_SPORT_ID };
