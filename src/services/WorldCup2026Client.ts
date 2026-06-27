import type { Team } from "../types";
import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { wc2026Endpoints } from "../config/wc2026Endpoints";
import {
  buildPlayerIndex,
  readWc2026PlayerStore,
} from "../lib/wc2026PlayerCache";
import { matchPlayerInRoster } from "./playerProfile/matchPlayerInRoster";
import { logger } from "./Logger";

const RAPIDAPI_HOST =
  providerByHost("world-cup-2026.p.rapidapi.com")?.host ?? "world-cup-2026.p.rapidapi.com";

let worldCup2026SessionDisabled = false;

export function isWorldCup2026Disabled(): boolean {
  return worldCup2026SessionDisabled;
}

export type Wc2026Tournament = {
  name: string;
  year: number;
  host: string;
  startDate: string;
  endDate: string;
  teamsCount: number;
  description?: string;
};

export type Wc2026Team = {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo?: string;
  color?: string;
  slug?: string;
  image?: string;
  teamPhoto?: string;
};

export type Wc2026Player = {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  positionAbbr?: string;
  image?: string | null;
  age?: number;
  citizenship?: string;
  jerseyNumber?: string;
  teamId?: string;
  teamName?: string;
  marketValue?: { valueM?: number; display?: string };
  club?: string;
  birthplace?: string;
  hometown?: string;
};

export type Wc2026TeamDetail = {
  tournament?: Wc2026Tournament;
  team?: Wc2026Team;
  players?: Wc2026Player[];
  playersCount?: number;
};

const ROSTER_CACHE_TTL_MS = 30 * 60 * 1000;
const rosterCache = new Map<string, Wc2026Player[]>();
const abbrevToWcId = new Map<string, string>();
let tournamentCache: Wc2026Tournament | null = null;
let playerIndex = buildPlayerIndex(readWc2026PlayerStore().players);

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${RAPIDAPI_HOST}`;
  }
  return "/api/wc2026";
}

function rapidHeaders(): HeadersInit {
  return rapidApiHeaders(RAPIDAPI_HOST);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function cacheTournament(raw: unknown): void {
  if (!isRecord(raw)) return;
  const name = raw.name;
  const year = raw.year;
  const host = raw.host;
  const startDate = raw.startDate;
  const endDate = raw.endDate;
  const teamsCount = raw.teamsCount;
  if (
    typeof name !== "string" ||
    typeof year !== "number" ||
    typeof host !== "string" ||
    typeof startDate !== "string" ||
    typeof endDate !== "string" ||
    typeof teamsCount !== "number"
  ) {
    return;
  }
  tournamentCache = {
    name,
    year,
    host,
    startDate,
    endDate,
    teamsCount,
    description: typeof raw.description === "string" ? raw.description : undefined,
  };
}

function hydratePlayerIndex(players: Wc2026Player[]): void {
  playerIndex = buildPlayerIndex(players);
}

async function handleBlocked(res: Response): Promise<boolean> {
  if (res.status !== 401 && res.status !== 403 && res.status !== 429) {
    return false;
  }
  worldCup2026SessionDisabled = true;
  const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => "");
  logger.warn("WorldCup2026 blocked for session", "WorldCup2026Client", {
    status: res.status,
    bodySnippet,
  });
  return true;
}

function normalizeWcPlayer(raw: Record<string, unknown>): Wc2026Player | null {
  const id = raw.id;
  const fullName = raw.fullName ?? raw.name;
  if (id == null || fullName == null) return null;
  return {
    id: String(id),
    fullName: String(fullName),
    firstName: raw.firstName != null ? String(raw.firstName) : undefined,
    lastName: raw.lastName != null ? String(raw.lastName) : undefined,
    position: raw.position != null ? String(raw.position) : undefined,
    positionAbbr: raw.positionAbbr != null ? String(raw.positionAbbr) : undefined,
    image: typeof raw.image === "string" ? raw.image : raw.image === null ? null : undefined,
    age: typeof raw.age === "number" ? raw.age : raw.age != null ? Number(raw.age) : undefined,
    citizenship: raw.citizenship != null ? String(raw.citizenship) : undefined,
    jerseyNumber: raw.jerseyNumber != null ? String(raw.jerseyNumber) : undefined,
    teamId: raw.teamId != null ? String(raw.teamId) : undefined,
    teamName: raw.teamName != null ? String(raw.teamName) : undefined,
    marketValue: raw.marketValue as Wc2026Player["marketValue"],
    club:
      raw.club != null
        ? String(raw.club)
        : raw.currentClub != null
          ? String(raw.currentClub)
          : undefined,
    birthplace: raw.birthplace != null ? String(raw.birthplace) : undefined,
    hometown:
      raw.hometown != null
        ? String(raw.hometown)
        : raw.birthPlace != null
          ? String(raw.birthPlace)
          : undefined,
  };
}

export function getCachedTournamentInfo(): Wc2026Tournament | null {
  return tournamentCache;
}

/** Tournament metadata is included on teams/players list responses. */
export async function fetchTournamentInfo(): Promise<Wc2026Tournament | null> {
  if (tournamentCache) return tournamentCache;
  await fetchTeams();
  return tournamentCache;
}

export async function fetchTeams(): Promise<Wc2026Team[]> {
  if (worldCup2026SessionDisabled) return [];

  try {
    const res = await fetch(`${baseUrl()}${wc2026Endpoints.teams()}`, { headers: rapidHeaders() });
    if (await handleBlocked(res)) return [];
    if (!res.ok) throw new Error(`${res.status}`);

    const data = (await res.json()) as { tournament?: unknown; teams?: Wc2026Team[] };
    if (data.tournament) cacheTournament(data.tournament);
    const teams = data.teams ?? [];
    for (const team of teams) {
      if (team.abbreviation && team.id) {
        abbrevToWcId.set(team.abbreviation.toUpperCase(), team.id);
      }
    }
    return teams;
  } catch (error) {
    logger.warn("WorldCup2026 teams fetch failed", "WorldCup2026Client", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function fetchAllTeams(): Promise<Wc2026Team[]> {
  return fetchTeams();
}

export async function fetchAllPlayers(): Promise<Wc2026Player[]> {
  if (worldCup2026SessionDisabled || !isApiEnabled("wc2026Teams")) return [];

  try {
    const res = await fetch(`${baseUrl()}${wc2026Endpoints.players()}`, { headers: rapidHeaders() });
    if (await handleBlocked(res)) return [];
    if (!res.ok) return [];

    const data = (await res.json()) as { tournament?: unknown; players?: unknown[] };
    if (data.tournament) cacheTournament(data.tournament);
    const players = (data.players ?? [])
      .map((p) => normalizeWcPlayer(p as Record<string, unknown>))
      .filter((p): p is Wc2026Player => p != null);

    hydratePlayerIndex(players);
    return players;
  } catch (error) {
    logger.warn("WorldCup2026 players fetch failed", "WorldCup2026Client", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function fetchTeam(teamId: string): Promise<Wc2026Team | null> {
  const detail = await fetchTeamDetail(teamId);
  return detail?.team ?? null;
}

export async function fetchTeamDetail(teamId: string): Promise<Wc2026TeamDetail | null> {
  if (worldCup2026SessionDisabled) return null;

  try {
    const res = await fetch(`${baseUrl()}${wc2026Endpoints.team(teamId)}`, { headers: rapidHeaders() });
    if (await handleBlocked(res)) return null;
    if (!res.ok) return null;

    const data = (await res.json()) as Wc2026TeamDetail & { players?: unknown[] };
    if (data.tournament) cacheTournament(data.tournament);
    const players = (data.players ?? [])
      .map((p) => normalizeWcPlayer(p as Record<string, unknown>))
      .filter((p): p is Wc2026Player => p != null);

    if (players.length > 0) {
      rosterCache.set(teamId, players);
      setTimeout(() => rosterCache.delete(teamId), ROSTER_CACHE_TTL_MS);
    }

    return { ...data, players };
  } catch (error) {
    logger.warn("WorldCup2026 team fetch failed", "WorldCup2026Client", {
      error: error instanceof Error ? error.message : String(error),
      teamId,
    });
    return null;
  }
}

export async function fetchTeamPlayers(wcTeamId: string): Promise<Wc2026Player[]> {
  const cached = rosterCache.get(wcTeamId);
  if (cached) return cached;

  const detail = await fetchTeamDetail(wcTeamId);
  return detail?.players ?? [];
}

/** Photo URLs ship on player records — there is no separate working photo route upstream. */
export function getPlayerPhotoUrl(playerId: string): string | undefined {
  if (playerIndex.size === 0) {
    hydratePlayerIndex(readWc2026PlayerStore().players);
  }
  const image = playerIndex.get(playerId)?.image;
  return typeof image === "string" && image.trim() ? image : undefined;
}

export async function fetchPlayerPhotoUrl(playerId: string): Promise<string | undefined> {
  if (!playerIndex.has(playerId)) {
    const store = readWc2026PlayerStore();
    if (store.players.length > 0) {
      hydratePlayerIndex(store.players);
    } else {
      await fetchAllPlayers();
    }
  }
  return getPlayerPhotoUrl(playerId);
}

export function lookupWc2026Player(opts: {
  playerId?: string;
  playerName: string;
}): Wc2026Player | undefined {
  if (playerIndex.size === 0) {
    hydratePlayerIndex(readWc2026PlayerStore().players);
  }
  return matchPlayerInRoster([...playerIndex.values()], opts);
}

export async function resolveWc2026TeamId(abbreviation: string): Promise<string | undefined> {
  const key = abbreviation.toUpperCase();
  const hit = abbrevToWcId.get(key);
  if (hit) return hit;
  await fetchTeams();
  return abbrevToWcId.get(key);
}

export function getWc2026TeamIdFromCache(abbreviation: string): string | undefined {
  return abbrevToWcId.get(abbreviation.toUpperCase());
}

export async function fetchGroups(): Promise<unknown> {
  if (worldCup2026SessionDisabled) return null;

  try {
    const res = await fetch(`${baseUrl()}${wc2026Endpoints.groups()}`, { headers: rapidHeaders() });
    if (await handleBlocked(res)) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    logger.warn("WorldCup2026 groups fetch failed", "WorldCup2026Client", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function mergeTeamMetadata(
  teams: Record<string, Team>,
  wcTeams: Wc2026Team[]
): { teams: Record<string, Team>; patched: number } {
  const byAbbrev = new Map(wcTeams.map((t) => [t.abbreviation.toUpperCase(), t]));
  const result: Record<string, Team> = { ...teams };
  let patched = 0;

  for (const [id, team] of Object.entries(teams)) {
    const wc = byAbbrev.get(team.abbreviation.toUpperCase());
    if (!wc) continue;

    const updates: Partial<Team> = {};
    if (wc.logo) updates.logo = wc.logo;
    if (wc.color) updates.color = wc.color;
    if (wc.id) updates.wc2026TeamId = wc.id;

    if (Object.keys(updates).length === 0) continue;

    result[id] = { ...team, ...updates };
    patched += 1;
  }

  return { teams: result, patched };
}

export function resetWorldCup2026SessionForTests(): void {
  worldCup2026SessionDisabled = false;
  rosterCache.clear();
  abbrevToWcId.clear();
  tournamentCache = null;
  playerIndex = new Map();
}

export function seedWc2026PlayerIndexForTests(players: Wc2026Player[]): void {
  hydratePlayerIndex(players);
}
