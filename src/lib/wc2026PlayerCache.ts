import type { Wc2026Player } from "../services/WorldCup2026Client";
import { PROFILE_TTL_MS } from "./teamProfileCache";

export const WC2026_PLAYER_CACHE_KEY = "wc2026-players-v1";

export type Wc2026PlayerCacheStore = {
  version: 1;
  lastSyncAt: string | null;
  players: Wc2026Player[];
};

const EMPTY: Wc2026PlayerCacheStore = {
  version: 1,
  lastSyncAt: null,
  players: [],
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function readWc2026PlayerStore(): Wc2026PlayerCacheStore {
  if (typeof localStorage === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(WC2026_PLAYER_CACHE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return { ...EMPTY };
    return {
      version: 1,
      lastSyncAt: typeof parsed.lastSyncAt === "string" ? parsed.lastSyncAt : null,
      players: Array.isArray(parsed.players) ? (parsed.players as Wc2026Player[]) : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeWc2026PlayerStore(store: Wc2026PlayerCacheStore): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(WC2026_PLAYER_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function isWc2026PlayerCacheStale(lastSyncAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastSyncAt) return true;
  const ts = Date.parse(lastSyncAt);
  if (!Number.isFinite(ts)) return true;
  return now - ts >= PROFILE_TTL_MS;
}

export function buildPlayerIndex(players: Wc2026Player[]): Map<string, Wc2026Player> {
  return new Map(players.map((p) => [p.id, p]));
}
