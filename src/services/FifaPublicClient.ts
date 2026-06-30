import { isApiEnabled } from "../config/apiFlags";
import {
  FifaPublicLiveResponseSchema,
  FifaPublicMatchesResponseSchema,
  FifaPublicStadiumsResponseSchema,
  FifaPublicTeamsResponseSchema,
  type FifaPublicLiveMatch,
  type FifaPublicMatch,
  type FifaPublicStadium,
  type FifaPublicTeam,
} from "../schemas/fifaPublic";
import { logger } from "./Logger";

const CACHE_KEY = "wc-fifa-public-v1";
const MATCHES_TTL_MS = 60_000;
const STATIC_TTL_MS = 5 * 60_000;
const LIVE_TTL_MS = 15_000;

type CacheBucket<T> = { fetchedAt: number; data: T };

let memoryMatches: CacheBucket<FifaPublicMatch[]> | null = null;
let memoryTeams: CacheBucket<FifaPublicTeam[]> | null = null;
let memoryStadiums: CacheBucket<FifaPublicStadium[]> | null = null;
let memoryLive: CacheBucket<FifaPublicLiveMatch[]> | null = null;

export function fifaPublicBaseUrl(): string {
  const env = import.meta.env.VITE_FIFA_PUBLIC_API_URL;
  if (env?.trim()) return env.replace(/\/$/, "");
  return "/api/fifa-public";
}

export function isFifaPublicDisabled(): boolean {
  return !isApiEnabled("fifaPublicApi");
}

function readSessionCache<T>(key: string, ttlMs: number): CacheBucket<T> | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY}:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheBucket<T>;
    if (Date.now() - parsed.fetchedAt > ttlMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache<T>(key: string, data: T): CacheBucket<T> {
  const entry = { fetchedAt: Date.now(), data };
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(`${CACHE_KEY}:${key}`, JSON.stringify(entry));
    } catch {
      // quota or private mode
    }
  }
  return entry;
}

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(`${fifaPublicBaseUrl()}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`FIFA public API ${path} failed: ${res.status}`);
  return res.json();
}

async function loadMatches(): Promise<FifaPublicMatch[]> {
  if (isFifaPublicDisabled()) return [];

  const cached = memoryMatches ?? readSessionCache<FifaPublicMatch[]>("matches", MATCHES_TTL_MS);
  if (cached) {
    memoryMatches = cached;
    return cached.data;
  }

  try {
    const json = await fetchJson("/api/wc2026/matches?count=500");
    const parsed = FifaPublicMatchesResponseSchema.parse(json);
    memoryMatches = writeSessionCache("matches", parsed.matches);
    return parsed.matches;
  } catch (error) {
    logger.warn("FIFA public matches fetch failed", "FifaPublicClient", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return memoryMatches?.data ?? [];
  }
}

async function loadTeams(): Promise<FifaPublicTeam[]> {
  if (isFifaPublicDisabled()) return [];

  const cached = memoryTeams ?? readSessionCache<FifaPublicTeam[]>("teams", STATIC_TTL_MS);
  if (cached) {
    memoryTeams = cached;
    return cached.data;
  }

  try {
    const json = await fetchJson("/api/wc2026/teams");
    const parsed = FifaPublicTeamsResponseSchema.parse(json);
    memoryTeams = writeSessionCache("teams", parsed.teams);
    return parsed.teams;
  } catch (error) {
    logger.warn("FIFA public teams fetch failed", "FifaPublicClient", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return memoryTeams?.data ?? [];
  }
}

async function loadStadiums(): Promise<FifaPublicStadium[]> {
  if (isFifaPublicDisabled()) return [];

  const cached = memoryStadiums ?? readSessionCache<FifaPublicStadium[]>("stadiums", STATIC_TTL_MS);
  if (cached) {
    memoryStadiums = cached;
    return cached.data;
  }

  try {
    const json = await fetchJson("/api/wc2026/stadiums");
    const parsed = FifaPublicStadiumsResponseSchema.parse(json);
    memoryStadiums = writeSessionCache("stadiums", parsed.stadiums);
    return parsed.stadiums;
  } catch (error) {
    logger.warn("FIFA public stadiums fetch failed", "FifaPublicClient", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return memoryStadiums?.data ?? [];
  }
}

async function loadLive(): Promise<FifaPublicLiveMatch[]> {
  if (isFifaPublicDisabled()) return [];

  const cached = memoryLive ?? readSessionCache<FifaPublicLiveMatch[]>("live", LIVE_TTL_MS);
  if (cached) {
    memoryLive = cached;
    return cached.data;
  }

  try {
    const json = await fetchJson("/api/wc2026/live");
    const parsed = FifaPublicLiveResponseSchema.parse(json);
    memoryLive = writeSessionCache("live", parsed.matches);
    return parsed.matches;
  } catch (error) {
    logger.warn("FIFA public live fetch failed", "FifaPublicClient", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return memoryLive?.data ?? [];
  }
}

export async function fetchWc2026Matches(): Promise<FifaPublicMatch[]> {
  return loadMatches();
}

export async function fetchWc2026Teams(): Promise<FifaPublicTeam[]> {
  return loadTeams();
}

export async function fetchWc2026Stadiums(): Promise<FifaPublicStadium[]> {
  return loadStadiums();
}

export async function fetchWc2026Live(): Promise<FifaPublicLiveMatch[]> {
  return loadLive();
}
