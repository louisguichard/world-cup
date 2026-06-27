import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { PLDATA_HOST, pldataEndpoints } from "../config/pldataEndpoints";
import type {
  PlDataMatch,
  PlDataNewsItem,
  PlDataPlayer,
  PlDataStandingRow,
  PlDataTeam,
  PlDataTopScorer,
  PlDataTransfer,
} from "../types/pldata";
import { logger } from "./Logger";

const RAPIDAPI_HOST = providerByHost(PLDATA_HOST)?.host ?? PLDATA_HOST;

let sessionDisabled = false;
const playerCache = new Map<string, PlDataPlayer | null>();

export function isPlDataDisabled(): boolean {
  return sessionDisabled || !isApiEnabled("plData");
}

export function resetPlDataSessionForTests(): void {
  sessionDisabled = false;
  playerCache.clear();
}

function baseUrl(): string {
  if (typeof window === "undefined") return `https://${RAPIDAPI_HOST}`;
  return "/api/pldata";
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

  for (const key of ["data", "results", "items", "players", "teams", "matches", "fixtures", "news", "transfers", "standings", "table", "topscorers", "squad"]) {
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
  if (isRecord(raw.data) && !Array.isArray(raw.data)) {
    if (isRecord(raw.data.player)) return raw.data.player;
    if (isRecord(raw.data.team)) return raw.data.team;
    return raw.data;
  }
  if (isRecord(raw.player)) return raw.player;
  if (isRecord(raw.team)) return raw.team;
  return raw;
}

export function normalizePlDataPlayer(raw: unknown, fallbackName?: string): PlDataPlayer | null {
  const obj = unwrapDetail(raw);
  if (!obj) return null;

  const name =
    pickString(obj, ["name", "displayName", "fullName", "playerName", "player"]) ?? fallbackName;
  if (!name) return null;

  const photoUrl =
    pickString(obj, ["photoUrl", "photo", "image", "headshot", "profileImage", "playerImage"]) ??
    pickString(obj, ["imageUrl", "img"]);

  return {
    id: pickField(obj, ["id", "playerId", "player_id"]) as string | number | undefined,
    name,
    displayName: pickString(obj, ["displayName", "fullName"]) ?? name,
    position: pickString(obj, ["position", "positionInfo", "role"]),
    positionInfo: pickString(obj, ["positionInfo", "position_detail"]),
    shirtNumber: num(pickField(obj, ["shirtNumber", "shirt_number", "number", "jerseyNumber"])),
    age: num(pickField(obj, ["age"])),
    dateOfBirth: pickString(obj, ["dateOfBirth", "dob", "birthDate"]),
    nationality: pickString(obj, ["nationality", "country", "nation"]),
    country: pickString(obj, ["country", "nationality"]),
    currentClub: pickString(obj, ["currentClub", "club", "teamName", "team"]),
    team: pickString(obj, ["team", "teamName", "club"]),
    teamName: pickString(obj, ["teamName", "team", "club"]),
    photoUrl,
    image: photoUrl,
    goals: num(pickField(obj, ["goals", "goalsScored"])),
    assists: num(pickField(obj, ["assists"])),
    appearances: num(pickField(obj, ["appearances", "apps"])),
    minutesPlayed: num(pickField(obj, ["minutesPlayed", "minutes"])),
    height: num(pickField(obj, ["height"])),
    weight: num(pickField(obj, ["weight"])),
    raw: obj,
  };
}

export function normalizePlDataTeam(raw: unknown, fallbackName?: string): PlDataTeam | null {
  const obj = unwrapDetail(raw);
  if (!obj) return null;

  const name = pickString(obj, ["name", "teamName", "club", "displayName"]) ?? fallbackName;
  if (!name) return null;

  const crestUrl =
    pickString(obj, ["crestUrl", "crest", "logo", "badge", "teamLogo", "clubLogo"]) ??
    pickString(obj, ["image", "imageUrl"]);

  return {
    id: pickField(obj, ["id", "teamId", "team_id"]) as string | number | undefined,
    name,
    shortName: pickString(obj, ["shortName", "abbreviation", "code"]),
    code: pickString(obj, ["code", "tla", "abbreviation"]),
    crestUrl,
    logo: crestUrl,
    stadium: pickString(obj, ["stadium", "venue", "ground"]),
    manager: pickString(obj, ["manager", "coach", "headCoach"]),
    founded: num(pickField(obj, ["founded", "yearFounded"])),
    raw: obj,
  };
}

export function normalizePlDataMatch(raw: unknown): PlDataMatch | null {
  if (!isRecord(raw)) return null;

  const homeTeam =
    pickString(raw, ["homeTeam", "home_team", "home"]) ??
  (isRecord(raw.home) ? pickString(raw.home, ["name", "teamName"]) : undefined);
  const awayTeam =
    pickString(raw, ["awayTeam", "away_team", "away"]) ??
    (isRecord(raw.away) ? pickString(raw.away, ["name", "teamName"]) : undefined);

  if (!homeTeam || !awayTeam) return null;

  return {
    id: pickField(raw, ["id", "matchId", "fixtureId"]) as string | number | undefined,
    homeTeam,
    awayTeam,
    homeScore: num(pickField(raw, ["homeScore", "home_score", "scoreHome"])),
    awayScore: num(pickField(raw, ["awayScore", "away_score", "scoreAway"])),
    status: pickString(raw, ["status", "matchStatus", "state"]),
    kickoff: pickString(raw, ["kickoff", "kickOff", "date", "startTime", "fixtureDate"]),
    matchweek: num(pickField(raw, ["matchweek", "round", "gameweek"])),
    raw,
  };
}

export function normalizePlDataStandingRow(raw: unknown): PlDataStandingRow | null {
  if (!isRecord(raw)) return null;

  const team =
    pickString(raw, ["team", "teamName", "club", "name"]) ??
    (isRecord(raw.team) ? pickString(raw.team, ["name", "teamName"]) : undefined);
  const position = num(pickField(raw, ["position", "rank", "place", "pos"]));
  if (!team || position == null) return null;

  return {
    position,
    team,
    played: num(pickField(raw, ["played", "matchesPlayed", "gamesPlayed", "P"])),
    won: num(pickField(raw, ["won", "wins", "W"])),
    drawn: num(pickField(raw, ["drawn", "draws", "D"])),
    lost: num(pickField(raw, ["lost", "losses", "L"])),
    goalsFor: num(pickField(raw, ["goalsFor", "goals_for", "GF", "for"])),
    goalsAgainst: num(pickField(raw, ["goalsAgainst", "goals_against", "GA", "against"])),
    goalDifference: num(pickField(raw, ["goalDifference", "goal_diff", "GD", "diff"])),
    points: num(pickField(raw, ["points", "pts", "P"])),
    raw,
  };
}

export function normalizePlDataTopScorer(raw: unknown): PlDataTopScorer | null {
  if (!isRecord(raw)) return null;

  const player =
    pickString(raw, ["player", "name", "playerName"]) ??
    (isRecord(raw.player) ? pickString(raw.player, ["name", "displayName"]) : undefined);
  if (!player) return null;

  return {
    rank: num(pickField(raw, ["rank", "position"])),
    player,
    team:
      pickString(raw, ["team", "teamName", "club"]) ??
      (isRecord(raw.team) ? pickString(raw.team, ["name"]) : undefined),
    goals: num(pickField(raw, ["goals", "goalsScored"])),
    assists: num(pickField(raw, ["assists"])),
    raw,
  };
}

export function normalizePlDataNewsItem(raw: unknown): PlDataNewsItem | null {
  if (!isRecord(raw)) return null;
  const title = pickString(raw, ["title", "headline", "name"]);
  if (!title) return null;

  return {
    title,
    url: pickString(raw, ["url", "link", "href"]),
    publishedAt: pickString(raw, ["publishedAt", "published", "date", "pubDate"]),
    summary: pickString(raw, ["summary", "description", "excerpt"]),
    raw,
  };
}

export function normalizePlDataTransfer(raw: unknown): PlDataTransfer | null {
  if (!isRecord(raw)) return null;
  const player = pickString(raw, ["player", "name", "playerName"]);
  if (!player) return null;

  return {
    player,
    fromTeam: pickString(raw, ["fromTeam", "from", "fromClub"]),
    toTeam: pickString(raw, ["toTeam", "to", "toClub"]),
    fee: pickString(raw, ["fee", "transferFee", "amount"]),
    date: pickString(raw, ["date", "transferDate"]),
    raw,
  };
}

async function fetchJson(path: string): Promise<unknown | null> {
  if (isPlDataDisabled()) return null;
  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: headers() });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      sessionDisabled = true;
      logger.warn("PlData", `Blocked ${res.status} on ${path}`);
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    logger.warn("PlData", `Fetch failed ${path}: ${String(err)}`);
    return null;
  }
}

function normalizePlayerList(raw: unknown): PlDataPlayer[] {
  return unwrapList(raw)
    .map((item) => normalizePlDataPlayer(item))
    .filter((p): p is PlDataPlayer => p != null);
}

function normalizeTeamList(raw: unknown): PlDataTeam[] {
  return unwrapList(raw)
    .map((item) => normalizePlDataTeam(item))
    .filter((t): t is PlDataTeam => t != null);
}

function normalizeMatchList(raw: unknown): PlDataMatch[] {
  return unwrapList(raw)
    .map((item) => normalizePlDataMatch(item))
    .filter((m): m is PlDataMatch => m != null);
}

function normalizeStandingList(raw: unknown): PlDataStandingRow[] {
  return unwrapList(raw)
    .map((item) => normalizePlDataStandingRow(item))
    .filter((r): r is PlDataStandingRow => r != null);
}

function normalizeTopScorerList(raw: unknown): PlDataTopScorer[] {
  return unwrapList(raw)
    .map((item) => normalizePlDataTopScorer(item))
    .filter((s): s is PlDataTopScorer => s != null);
}

function normalizeNewsList(raw: unknown): PlDataNewsItem[] {
  return unwrapList(raw)
    .map((item) => normalizePlDataNewsItem(item))
    .filter((n): n is PlDataNewsItem => n != null);
}

function normalizeTransferList(raw: unknown): PlDataTransfer[] {
  return unwrapList(raw)
    .map((item) => normalizePlDataTransfer(item))
    .filter((t): t is PlDataTransfer => t != null);
}

export async function fetchPlDataPlayer(name: string): Promise<PlDataPlayer | null> {
  const key = name.trim().toLowerCase();
  if (playerCache.has(key)) return playerCache.get(key) ?? null;

  const raw = await fetchJson(pldataEndpoints.player(name));
  const player = normalizePlDataPlayer(raw, name);
  playerCache.set(key, player);
  return player;
}

export async function fetchPlDataPlayers(
  query?: Record<string, string | number>
): Promise<PlDataPlayer[]> {
  const raw = await fetchJson(pldataEndpoints.players(query));
  return normalizePlayerList(raw);
}

export async function fetchPlDataTeam(name: string): Promise<PlDataTeam | null> {
  const raw = await fetchJson(pldataEndpoints.team(name));
  return normalizePlDataTeam(raw, name);
}

export async function fetchPlDataTeams(
  query?: Record<string, string | number>
): Promise<PlDataTeam[]> {
  const raw = await fetchJson(pldataEndpoints.teams(query));
  return normalizeTeamList(raw);
}

export async function fetchPlDataClub(name: string): Promise<PlDataTeam | null> {
  const raw = await fetchJson(pldataEndpoints.club(name));
  return normalizePlDataTeam(raw, name);
}

export async function fetchPlDataClubs(
  query?: Record<string, string | number>
): Promise<PlDataTeam[]> {
  const raw = await fetchJson(pldataEndpoints.clubs(query));
  return normalizeTeamList(raw);
}

export async function fetchPlDataSquad(name: string): Promise<PlDataPlayer[]> {
  const raw = await fetchJson(pldataEndpoints.squad(name));
  return normalizePlayerList(raw);
}

export async function fetchPlDataSquadByTeam(name: string): Promise<PlDataPlayer[]> {
  const raw = await fetchJson(pldataEndpoints.squadByTeam(name));
  return normalizePlayerList(raw);
}

export async function fetchPlDataManager(name: string): Promise<PlDataPlayer | null> {
  const raw = await fetchJson(pldataEndpoints.manager(name));
  return normalizePlDataPlayer(raw, name);
}

export async function fetchPlDataCoach(name: string): Promise<PlDataPlayer | null> {
  const raw = await fetchJson(pldataEndpoints.coach(name));
  return normalizePlDataPlayer(raw, name);
}

export async function fetchPlDataMatch(id: string | number): Promise<PlDataMatch | null> {
  const raw = await fetchJson(pldataEndpoints.match(id));
  return normalizePlDataMatch(unwrapDetail(raw));
}

export async function fetchPlDataMatches(
  query?: Record<string, string | number>
): Promise<PlDataMatch[]> {
  const raw = await fetchJson(pldataEndpoints.matches(query));
  return normalizeMatchList(raw);
}

export async function fetchPlDataFixture(id: string | number): Promise<PlDataMatch | null> {
  const raw = await fetchJson(pldataEndpoints.fixture(id));
  return normalizePlDataMatch(unwrapDetail(raw));
}

export async function fetchPlDataFixtures(
  query?: Record<string, string | number>
): Promise<PlDataMatch[]> {
  const raw = await fetchJson(pldataEndpoints.fixtures(query));
  return normalizeMatchList(raw);
}

export async function fetchPlDataStandings(
  query?: Record<string, string | number>
): Promise<PlDataStandingRow[]> {
  const raw = await fetchJson(pldataEndpoints.standings(query));
  return normalizeStandingList(raw);
}

export async function fetchPlDataTable(
  query?: Record<string, string | number>
): Promise<PlDataStandingRow[]> {
  const raw = await fetchJson(pldataEndpoints.table(query));
  return normalizeStandingList(raw);
}

export async function fetchPlDataLeague(
  query?: Record<string, string | number>
): Promise<unknown | null> {
  return fetchJson(pldataEndpoints.league(query));
}

export async function fetchPlDataLeagues(
  query?: Record<string, string | number>
): Promise<unknown | null> {
  return fetchJson(pldataEndpoints.leagues(query));
}

export async function fetchPlDataSeason(year: string | number): Promise<unknown | null> {
  return fetchJson(pldataEndpoints.season(year));
}

export async function fetchPlDataSeasons(
  query?: Record<string, string | number>
): Promise<unknown | null> {
  return fetchJson(pldataEndpoints.seasons(query));
}

export async function fetchPlDataStats(
  query?: Record<string, string | number>
): Promise<unknown | null> {
  return fetchJson(pldataEndpoints.stats(query));
}

export async function fetchPlDataStatsTopScorers(
  query?: Record<string, string | number>
): Promise<PlDataTopScorer[]> {
  const raw = await fetchJson(pldataEndpoints.statsTopScorers(query));
  return normalizeTopScorerList(raw);
}

export async function fetchPlDataTopScorers(
  query?: Record<string, string | number>
): Promise<PlDataTopScorer[]> {
  const raw = await fetchJson(pldataEndpoints.topscorers(query));
  return normalizeTopScorerList(raw);
}

export async function fetchPlDataSearch(query: string): Promise<unknown | null> {
  return fetchJson(pldataEndpoints.search(query));
}

export async function fetchPlDataNews(
  query?: Record<string, string | number>
): Promise<PlDataNewsItem[]> {
  const raw = await fetchJson(pldataEndpoints.news(query));
  return normalizeNewsList(raw);
}

export async function fetchPlDataTransfers(
  query?: Record<string, string | number>
): Promise<PlDataTransfer[]> {
  const raw = await fetchJson(pldataEndpoints.transfers(query));
  return normalizeTransferList(raw);
}

/** Lookup player by name for profile enrichment (cached per session). */
export async function lookupPlDataPlayerByName(name: string): Promise<PlDataPlayer | null> {
  const direct = await fetchPlDataPlayer(name);
  if (direct) return direct;

  const searchRaw = await fetchPlDataSearch(name);
  const fromSearch = normalizePlayerList(searchRaw);
  const key = name.trim().toLowerCase();
  const exact = fromSearch.find((p) => p.name.toLowerCase() === key);
  return exact ?? fromSearch[0] ?? null;
}
