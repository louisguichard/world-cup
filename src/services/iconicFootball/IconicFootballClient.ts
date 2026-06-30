import { ICONIC_FOOTBALL_PLAYERS_URL } from "../../config/iconicFootballEndpoints";
import { isApiEnabled } from "../../config/apiFlags";
import { playerNamesMatch } from "../playerProfile/normalizePlayerName";
import { mapIconicPlayerToRef } from "./mapIconicPlayer";
import { readSessionCache, writeSessionCache } from "./sessionCache";
import type {
  IconicFootballListResponse,
  IconicFootballPlayer,
  IconicPlayerCareer,
  IconicPlayerRef,
} from "./types";

const INDEX_CACHE_KEY = "iconicfootball:player-index-v2";
const CAREER_CACHE_PREFIX = "iconicfootball:career:";
const MAX_PAGES = 20;
const PER_PAGE = 50;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseListResponse(json: unknown): IconicFootballListResponse | null {
  if (!isRecord(json) || !Array.isArray(json.data) || !isRecord(json.meta)) return null;
  return json as IconicFootballListResponse;
}

async function fetchPlayerPage(page: number): Promise<IconicFootballPlayer[]> {
  const url = `${ICONIC_FOOTBALL_PLAYERS_URL}?include=club,country&per_page=${PER_PAGE}&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const parsed = parseListResponse(await res.json());
  return parsed?.data ?? [];
}

let memoryIndex: IconicFootballPlayer[] | null = null;
let indexLoading: Promise<IconicFootballPlayer[]> | null = null;

/** Paginated fetch of all iconic players (typically a small catalog). */
export async function fetchIconicPlayers(): Promise<IconicFootballPlayer[]> {
  if (!isApiEnabled("iconicFootball")) return [];

  const cached = readSessionCache<IconicFootballPlayer[]>(INDEX_CACHE_KEY);
  if (cached) {
    memoryIndex = cached;
    return cached;
  }
  if (memoryIndex) return memoryIndex;

  if (!indexLoading) {
    indexLoading = (async () => {
      const all: IconicFootballPlayer[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const batch = await fetchPlayerPage(page);
        if (batch.length === 0) break;
        all.push(...batch);
        if (batch.length < PER_PAGE) break;
      }
      memoryIndex = all;
      writeSessionCache(INDEX_CACHE_KEY, all);
      return all;
    })();
  }

  return indexLoading;
}

export async function fetchIconicPlayerRefs(): Promise<IconicPlayerRef[]> {
  const players = await fetchIconicPlayers();
  return players.map(mapIconicPlayerToRef);
}

function findByName(players: IconicFootballPlayer[], query: string): IconicFootballPlayer | undefined {
  const trimmed = query.trim();
  if (!trimmed) return undefined;
  return players.find(
    (p) =>
      playerNamesMatch(p.full_name, trimmed) ||
      playerNamesMatch(p.known_as, trimmed) ||
      p.known_as.toLowerCase() === trimmed.toLowerCase()
  );
}

/** Portrait URL for an iconic player by display name (sync after index warm). */
export function lookupIconicPlayerPhoto(playerName: string): string | undefined {
  if (!memoryIndex) return undefined;
  const hit = findByName(memoryIndex, playerName);
  const img = hit?.img?.trim();
  return img || undefined;
}

/** Async portrait lookup — warms player index if needed. */
export async function lookupIconicPlayerPhotoAsync(playerName: string): Promise<string | undefined> {
  if (!isApiEnabled("iconicFootball")) return undefined;
  await fetchIconicPlayers();
  return lookupIconicPlayerPhoto(playerName);
}

/** Prime-era stats + portrait for iconic players. */
export async function getPlayerCareer(playerName: string): Promise<IconicPlayerCareer | null> {
  if (!isApiEnabled("iconicFootball")) return null;

  const cacheKey = `${CAREER_CACHE_PREFIX}${playerName.trim().toLowerCase()}`;
  const cached = readSessionCache<IconicPlayerCareer>(cacheKey);
  if (cached) return cached;

  const index = await fetchIconicPlayers();
  const hit = findByName(index, playerName);
  if (!hit) return null;

  const career: IconicPlayerCareer = { player: hit, source: "iconicfootball" };
  writeSessionCache(cacheKey, career);
  return career;
}

/** IconicFootball does not expose H2H match history. */
export async function getHistoricalMatchData(_homeTeam: string, _awayTeam: string): Promise<null> {
  return null;
}

export async function getHeadToHeadFromPlayerProfiles(_homeSlug: string, _awaySlug: string): Promise<null> {
  return null;
}

/** Preload iconic player index during app boot (non-blocking). */
export function warmIconicFootballIndex(): void {
  if (!isApiEnabled("iconicFootball")) return;
  void fetchIconicPlayers();
}
