import type { TeamProfileBundle, TeamProfileCacheStore, TournamentProfileBundle } from "../types/teamProfile";

export const TEAM_PROFILE_CACHE_KEY = "wc-team-profile-v1";
export const TOURNAMENT_PROFILE_CACHE_KEY = "wc-tournament-profile-v1";
export const PROFILE_TTL_MS = 24 * 60 * 60 * 1000;

const EMPTY_STORE: TeamProfileCacheStore = {
  version: 2,
  lastGlobalSyncAt: null,
  profiles: {},
};

function migrateProfile(profile: Record<string, unknown>): import("../types/teamProfile").TeamProfileBundle {
  return {
    abbrev: String(profile.abbrev ?? ""),
    sofaTeamId: Number(profile.sofaTeamId ?? 0),
    fetchedAt: String(profile.fetchedAt ?? new Date().toISOString()),
    details: (profile.details as import("../types/teamProfile").TeamProfileBundle["details"]) ?? null,
    players: Array.isArray(profile.players) ? profile.players as import("../types/teamProfile").TeamProfileBundle["players"] : [],
    statistics: (profile.statistics as import("../types/teamProfile").TeamProfileBundle["statistics"]) ?? null,
    media: Array.isArray(profile.media) ? profile.media as import("../types/teamProfile").TeamProfileBundle["media"] : [],
    lastMatches: Array.isArray(profile.lastMatches) ? profile.lastMatches as import("../types/teamProfile").TeamProfileBundle["lastMatches"] : [],
    nextMatches: Array.isArray(profile.nextMatches) ? profile.nextMatches as import("../types/teamProfile").TeamProfileBundle["nextMatches"] : [],
    tournamentNames: Array.isArray(profile.tournamentNames) ? profile.tournamentNames as string[] : [],
    unavailable: Array.isArray(profile.unavailable) ? profile.unavailable as string[] : [],
    source: profile.source === "sofascore6" ? "sofascore6" : "sofascore-rapid",
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function readTeamProfileStore(): TeamProfileCacheStore {
  if (typeof localStorage === "undefined") return { ...EMPTY_STORE };
  try {
    const raw = localStorage.getItem(TEAM_PROFILE_CACHE_KEY);
    if (!raw) return { ...EMPTY_STORE };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || (parsed.version !== 1 && parsed.version !== 2)) return { ...EMPTY_STORE };
    const profiles: Record<string, import("../types/teamProfile").TeamProfileBundle> = {};
    if (isRecord(parsed.profiles)) {
      for (const [key, value] of Object.entries(parsed.profiles)) {
        if (isRecord(value)) profiles[key] = migrateProfile(value);
      }
    }
  return {
    version: 2,
    lastGlobalSyncAt: typeof parsed.lastGlobalSyncAt === "string" ? parsed.lastGlobalSyncAt : null,
    profiles,
  };
  } catch {
    return { ...EMPTY_STORE };
  }
}

export function writeTeamProfileStore(store: TeamProfileCacheStore): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(TEAM_PROFILE_CACHE_KEY, JSON.stringify({ ...store, version: 2 }));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function isProfileStale(fetchedAt: string | null | undefined, now = Date.now()): boolean {
  if (!fetchedAt) return true;
  const ts = Date.parse(fetchedAt);
  if (!Number.isFinite(ts)) return true;
  return now - ts >= PROFILE_TTL_MS;
}

export function isGlobalSyncDue(lastGlobalSyncAt: string | null, now = Date.now()): boolean {
  return isProfileStale(lastGlobalSyncAt, now);
}

export function upsertTeamProfile(
  store: TeamProfileCacheStore,
  profile: TeamProfileBundle
): TeamProfileCacheStore {
  return {
    ...store,
    profiles: { ...store.profiles, [profile.abbrev]: profile },
  };
}

export function readTournamentProfile(): TournamentProfileBundle | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOURNAMENT_PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.fetchedAt !== "string") return null;
    return parsed as TournamentProfileBundle;
  } catch {
    return null;
  }
}

export function writeTournamentProfile(profile: TournamentProfileBundle): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(TOURNAMENT_PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}
