import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import {
  FIFA_FOOTBALL_DATA_HOST,
  FIFA_WC2026_STAGE_ID,
  fifaFootballDataEndpoints,
} from "../config/fifaFootballDataEndpoints";
import type {
  FifaFootballMatch,
  FifaFootballPlayer,
  FifaFootballTeam,
  FifaMatchVideoClip,
} from "../types/fifaFootballData";
import { logger } from "./Logger";

const RAPIDAPI_HOST = providerByHost(FIFA_FOOTBALL_DATA_HOST)?.host ?? FIFA_FOOTBALL_DATA_HOST;

let sessionDisabled = false;

export function isFifaFootballDataDisabled(): boolean {
  return sessionDisabled || !isApiEnabled("fifaFootballData");
}

export function resetFifaFootballDataSessionForTests(): void {
  sessionDisabled = false;
}

function baseUrl(): string {
  if (typeof window === "undefined") return `https://${RAPIDAPI_HOST}`;
  return "/api/fifa-football-data";
}

function headers(): HeadersInit {
  return rapidApiHeaders(RAPIDAPI_HOST);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function pickField(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  return undefined;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  return str(pickField(obj, keys));
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!isRecord(raw)) return [];

  for (const key of [
    "data",
    "results",
    "items",
    "players",
    "teams",
    "matches",
    "videos",
    "highlights",
    "clips",
    "records",
    "statistics",
    "events",
    "lineups",
  ]) {
    const value = raw[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function unwrapDetail(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    return isRecord(first) ? first : null;
  }
  if (!isRecord(raw)) return null;
  if (isRecord(raw.data) && !Array.isArray(raw.data)) return raw.data;
  return raw;
}

export function normalizeFifaFootballPlayer(
  raw: unknown,
  fallbackName?: string
): FifaFootballPlayer | null {
  const obj = unwrapDetail(raw);
  if (!obj) return null;

  const name =
    pickString(obj, ["name", "displayName", "fullName", "playerName", "PlayerName"]) ??
    fallbackName;
  if (!name) return null;

  const photoUrl =
    pickString(obj, ["photoUrl", "photo", "image", "imageUrl", "playerImage", "headshot"]) ??
    pickString(obj, ["img", "imgUrl"]);

  return {
    id: pickField(obj, ["id", "playerId", "player_id"]) as string | number | undefined,
    name,
    displayName: pickString(obj, ["displayName", "fullName"]) ?? name,
    nationality: pickString(obj, ["nationality", "country", "nation"]),
    position: pickString(obj, ["position", "role", "positionInfo"]),
    shirtNumber: num(pickField(obj, ["shirtNumber", "shirt_number", "number", "jerseyNumber"])),
    age: num(pickField(obj, ["age"])),
    teamId: pickField(obj, ["teamId", "team_id"]) as string | number | undefined,
    teamName: pickString(obj, ["teamName", "team", "club"]),
    photoUrl,
    imageUrl: photoUrl,
    raw: obj,
  };
}

export function normalizeFifaFootballTeam(
  raw: unknown,
  fallbackName?: string
): FifaFootballTeam | null {
  const obj = unwrapDetail(raw);
  if (!obj) return null;

  const name = pickString(obj, ["name", "teamName", "club", "displayName"]) ?? fallbackName;
  if (!name) return null;

  const crestUrl =
    pickString(obj, ["crestUrl", "crest", "logo", "badge", "teamLogo", "image", "imageUrl"]) ??
    pickString(obj, ["img", "imgUrl"]);

  return {
    id: pickField(obj, ["id", "teamId", "team_id"]) as string | number | undefined,
    name,
    shortName: pickString(obj, ["shortName", "abbreviation", "code"]),
    code: pickString(obj, ["code", "tla"]),
    crestUrl,
    imageUrl: crestUrl,
    raw: obj,
  };
}

export function normalizeFifaFootballMatch(raw: unknown): FifaFootballMatch | null {
  if (!isRecord(raw)) return null;

  const homeTeam =
    pickString(raw, ["homeTeam", "home_team", "home", "HomeTeam"]) ??
    (isRecord(raw.home) ? pickString(raw.home, ["name", "teamName"]) : undefined);
  const awayTeam =
    pickString(raw, ["awayTeam", "away_team", "away", "AwayTeam"]) ??
    (isRecord(raw.away) ? pickString(raw.away, ["name", "teamName"]) : undefined);

  return {
    id: pickField(raw, ["id", "matchId", "fixtureId"]) as string | number | undefined,
    stageId: pickField(raw, ["stage", "stageId", "stage_id"]) as string | number | undefined,
    homeTeam,
    awayTeam,
    homeScore: num(pickField(raw, ["homeScore", "home_score", "scoreHome"])),
    awayScore: num(pickField(raw, ["awayScore", "away_score", "scoreAway"])),
    status: pickString(raw, ["status", "matchStatus", "state"]),
    kickoff: pickString(raw, ["kickoff", "kickOff", "date", "startTime"]),
    raw,
  };
}

export function normalizeFifaMatchVideoClip(raw: unknown): FifaMatchVideoClip | null {
  if (!isRecord(raw)) return null;

  const url =
    pickString(raw, ["url", "videoUrl", "video_url", "link", "href", "sourceUrl"]) ??
    pickString(raw, ["mp4", "hls"]);
  const embedUrl = pickString(raw, ["embedUrl", "embed_url", "iframe", "embed"]);
  const title = pickString(raw, ["title", "name", "label", "description"]);
  const thumbnailUrl =
    pickString(raw, ["thumbnailUrl", "thumbnail", "thumb", "imgUrl", "image", "poster"]) ??
    pickString(raw, ["img"]);

  if (!url && !embedUrl && !title) return null;

  return {
    id: pickField(raw, ["id", "videoId", "clipId"]) as string | number | undefined,
    title: title ?? "Match video",
    url,
    embedUrl,
    thumbnailUrl,
    type: pickString(raw, ["type", "clipType", "category"]),
    source: pickString(raw, ["source", "provider", "host"]) ?? "FIFA",
    raw,
  };
}

export function normalizeFifaMatchVideoClips(raw: unknown): FifaMatchVideoClip[] {
  const list = unwrapList(raw);
  if (list.length > 0) {
    return list
      .map((item) => normalizeFifaMatchVideoClip(item))
      .filter((clip): clip is FifaMatchVideoClip => clip != null);
  }

  const detail = unwrapDetail(raw);
  if (!detail) return [];

  const single = normalizeFifaMatchVideoClip(detail);
  if (single) return [single];

  for (const key of ["video", "highlight", "clip"]) {
    const nested = detail[key];
    const clip = normalizeFifaMatchVideoClip(nested);
    if (clip) return [clip];
  }

  return [];
}

async function fetchJson(path: string): Promise<unknown | null> {
  if (isFifaFootballDataDisabled()) return null;
  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: headers() });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      sessionDisabled = true;
      logger.warn("FifaFootballData", `Blocked ${res.status} on ${path}`);
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    logger.warn("FifaFootballData", `Fetch failed ${path}: ${String(err)}`);
    return null;
  }
}

function normalizePlayerList(raw: unknown): FifaFootballPlayer[] {
  return unwrapList(raw)
    .map((item) => normalizeFifaFootballPlayer(item))
    .filter((p): p is FifaFootballPlayer => p != null);
}

function normalizeTeamList(raw: unknown): FifaFootballTeam[] {
  return unwrapList(raw)
    .map((item) => normalizeFifaFootballTeam(item))
    .filter((t): t is FifaFootballTeam => t != null);
}

function normalizeMatchList(raw: unknown): FifaFootballMatch[] {
  return unwrapList(raw)
    .map((item) => normalizeFifaFootballMatch(item))
    .filter((m): m is FifaFootballMatch => m != null);
}

export async function fetchFifaSingleMatchVideo(
  stage: string | number,
  id: string | number
): Promise<FifaMatchVideoClip[]> {
  const raw = await fetchJson(fifaFootballDataEndpoints.singleMatchVideo(stage, id));
  return normalizeFifaMatchVideoClips(raw);
}

export async function fetchFifaSingleMatch(
  stage: string | number,
  id: string | number
): Promise<FifaFootballMatch | null> {
  const raw = await fetchJson(fifaFootballDataEndpoints.singleMatch(stage, id));
  return normalizeFifaFootballMatch(unwrapDetail(raw));
}

export async function fetchFifaMatchEvents(
  stage: string | number,
  id: string | number
): Promise<unknown | null> {
  return fetchJson(fifaFootballDataEndpoints.matchEvents(stage, id));
}

export async function fetchFifaMatchStats(
  stage: string | number,
  id: string | number
): Promise<unknown | null> {
  return fetchJson(fifaFootballDataEndpoints.matchStats(stage, id));
}

export async function fetchFifaLineups(
  stage: string | number,
  id: string | number
): Promise<unknown | null> {
  return fetchJson(fifaFootballDataEndpoints.lineups(stage, id));
}

export async function fetchFifaTeamMatchList(
  teamId: string | number
): Promise<FifaFootballMatch[]> {
  const raw = await fetchJson(fifaFootballDataEndpoints.teamMatchList(teamId));
  return normalizeMatchList(raw);
}

export async function fetchFifaMatchList(stage: string | number): Promise<FifaFootballMatch[]> {
  const raw = await fetchJson(fifaFootballDataEndpoints.matchList(stage));
  return normalizeMatchList(raw);
}

export async function fetchFifaMatchesList(stage: string | number): Promise<FifaFootballMatch[]> {
  const raw = await fetchJson(fifaFootballDataEndpoints.matchesList(stage));
  return normalizeMatchList(raw);
}

export async function fetchFifaStageMatchList(stage: string | number): Promise<FifaFootballMatch[]> {
  const raw = await fetchJson(fifaFootballDataEndpoints.stageMatchList(stage));
  return normalizeMatchList(raw);
}

export async function fetchFifaTournamentMatchList(
  stage: string | number
): Promise<FifaFootballMatch[]> {
  const raw = await fetchJson(fifaFootballDataEndpoints.tournamentMatchList(stage));
  return normalizeMatchList(raw);
}

export async function fetchFifaWorldCupMatchList(
  stage: string | number = FIFA_WC2026_STAGE_ID
): Promise<FifaFootballMatch[]> {
  const raw = await fetchJson(fifaFootballDataEndpoints.worldCupMatchList(stage));
  return normalizeMatchList(raw);
}

export async function fetchFifaPlayerList(): Promise<FifaFootballPlayer[]> {
  const raw = await fetchJson(fifaFootballDataEndpoints.playerList());
  return normalizePlayerList(raw);
}

export async function fetchFifaPlayersList(): Promise<FifaFootballPlayer[]> {
  const raw = await fetchJson(fifaFootballDataEndpoints.playersList());
  return normalizePlayerList(raw);
}

export async function fetchFifaAllPlayers(): Promise<FifaFootballPlayer[]> {
  const raw = await fetchJson(fifaFootballDataEndpoints.allPlayers());
  return normalizePlayerList(raw);
}

export async function fetchFifaPlayerDetail(
  id: string | number
): Promise<FifaFootballPlayer | null> {
  const raw = await fetchJson(fifaFootballDataEndpoints.playerDetail(id));
  return normalizeFifaFootballPlayer(raw);
}

export async function fetchFifaPlayerDetails(
  id: string | number
): Promise<FifaFootballPlayer | null> {
  const raw = await fetchJson(fifaFootballDataEndpoints.playerDetails(id));
  return normalizeFifaFootballPlayer(raw);
}

export async function fetchFifaPlayerImage(id: string | number): Promise<unknown | null> {
  return fetchJson(fifaFootballDataEndpoints.playerImage(id));
}

export async function fetchFifaPlayerStats(id: string | number): Promise<unknown | null> {
  return fetchJson(fifaFootballDataEndpoints.playerStats(id));
}

export async function fetchFifaPlayerStatistics(id: string | number): Promise<unknown | null> {
  return fetchJson(fifaFootballDataEndpoints.playerStatistics(id));
}

export async function fetchFifaPlayerRecords(id: string | number): Promise<unknown | null> {
  return fetchJson(fifaFootballDataEndpoints.playerRecords(id));
}

export async function fetchFifaTeamList(): Promise<FifaFootballTeam[]> {
  const raw = await fetchJson(fifaFootballDataEndpoints.teamList());
  return normalizeTeamList(raw);
}

export async function fetchFifaTeamsList(): Promise<FifaFootballTeam[]> {
  const raw = await fetchJson(fifaFootballDataEndpoints.teamsList());
  return normalizeTeamList(raw);
}

export async function fetchFifaAllTeams(): Promise<FifaFootballTeam[]> {
  const raw = await fetchJson(fifaFootballDataEndpoints.allTeams());
  return normalizeTeamList(raw);
}

export async function fetchFifaTeamDetail(id: string | number): Promise<FifaFootballTeam | null> {
  const raw = await fetchJson(fifaFootballDataEndpoints.teamDetail(id));
  return normalizeFifaFootballTeam(raw);
}

export async function fetchFifaTeamDetails(id: string | number): Promise<FifaFootballTeam | null> {
  const raw = await fetchJson(fifaFootballDataEndpoints.teamDetails(id));
  return normalizeFifaFootballTeam(raw);
}

export async function fetchFifaTeamImage(id: string | number): Promise<unknown | null> {
  return fetchJson(fifaFootballDataEndpoints.teamImage(id));
}

export async function fetchFifaTeamStats(id: string | number): Promise<unknown | null> {
  return fetchJson(fifaFootballDataEndpoints.teamStats(id));
}

export async function fetchFifaTeamStatistics(id: string | number): Promise<unknown | null> {
  return fetchJson(fifaFootballDataEndpoints.teamStatistics(id));
}

export async function fetchFifaTeamRecords(id: string | number): Promise<unknown | null> {
  return fetchJson(fifaFootballDataEndpoints.teamRecords(id));
}
