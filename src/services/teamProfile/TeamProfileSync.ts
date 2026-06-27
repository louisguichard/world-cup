import { TEAM_SOFA_IDS } from "../../data/teamSofaIds";
import {
  isGlobalSyncDue,
  isProfileStale,
  readTeamProfileStore,
  readTournamentProfile,
  writeTeamProfileStore,
  writeTournamentProfile,
} from "../../lib/teamProfileCache";
import type { TeamProfileBundle, TournamentProfileBundle } from "../../types/teamProfile";
import { fetchTournamentProfileBundleRapid } from "./fetchTournamentProfileRapid";
import {
  fetchUniqueTournamentDetails,
  fetchUniqueTournamentSeasons,
  isSofaScore6Disabled,
} from "../SofaScore6Client";
import { isSofaScoreRapidDisabled } from "../SofaScoreRapidClient";
import { logger } from "../Logger";
import { delay, fetchTeamProfileBundle } from "./fetchTeamProfileBundle";

const SYNC_DELAY_MS = 500;

export type TeamProfileSyncListener = (state: TeamProfileSyncState) => void;

export type TeamProfileSyncState = {
  running: boolean;
  completed: number;
  total: number;
  lastError: string | null;
  lastGlobalSyncAt: string | null;
};

let syncState: TeamProfileSyncState = {
  running: false,
  completed: 0,
  total: Object.keys(TEAM_SOFA_IDS).length,
  lastError: null,
  lastGlobalSyncAt: null,
};

const listeners = new Set<TeamProfileSyncListener>();

function emit(): void {
  for (const fn of listeners) fn({ ...syncState });
}

export function getTeamProfileSyncState(): TeamProfileSyncState {
  return { ...syncState };
}

export function subscribeTeamProfileSync(fn: TeamProfileSyncListener): () => void {
  listeners.add(fn);
  fn({ ...syncState });
  return () => listeners.delete(fn);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function loadCachedProfiles(): Record<string, TeamProfileBundle> {
  const store = readTeamProfileStore();
  syncState.lastGlobalSyncAt = store.lastGlobalSyncAt;
  return store.profiles;
}

export function getCachedProfile(abbrev: string): TeamProfileBundle | null {
  const key = abbrev.toUpperCase();
  const store = readTeamProfileStore();
  const profile = store.profiles[key];
  if (!profile) return null;
  if (isProfileStale(profile.fetchedAt)) return profile;
  return profile;
}

export async function fetchTournamentProfileBundle(): Promise<TournamentProfileBundle | null> {
  if (!isSofaScoreRapidDisabled()) {
    return fetchTournamentProfileBundleRapid();
  }

  if (isSofaScore6Disabled()) return null;

  const [detailsRaw, seasonsRaw] = await Promise.all([
    fetchUniqueTournamentDetails(),
    fetchUniqueTournamentSeasons(),
  ]);

  if (!detailsRaw && !seasonsRaw) return null;

  const details = isRecord(detailsRaw) ? detailsRaw : null;
  const seasons = Array.isArray(seasonsRaw)
    ? seasonsRaw
        .filter(isRecord)
        .map((s) => ({
          id: num(s.id) ?? 0,
          name: str(s.name) ?? "",
          year: str(s.year) ?? "",
        }))
        .filter((s) => s.id > 0)
    : [];

  return {
    fetchedAt: new Date().toISOString(),
    uniqueTournamentId: num(details?.id) ?? 16,
    name: str(details?.name),
    slug: str(details?.slug),
    imagePath: str(details?.imagePath),
    seasons,
    standingsGroups: [],
    topPlayers: [],
    topTeams: [],
    cupTreeNames: [],
  };
}

export async function syncTournamentProfileIfNeeded(): Promise<TournamentProfileBundle | null> {
  const cached = readTournamentProfile();
  if (cached && !isProfileStale(cached.fetchedAt)) return cached;

  const fresh = await fetchTournamentProfileBundle();
  if (fresh) writeTournamentProfile(fresh);
  return fresh ?? cached;
}

/** Background daily sync for all 48 WC teams. Idempotent — skips if TTL not expired. */
export async function syncAllTeamProfilesIfNeeded(
  onProfile?: (profile: TeamProfileBundle) => void
): Promise<void> {
  if (syncState.running || isSofaScore6Disabled()) return;

  let store = readTeamProfileStore();
  if (!isGlobalSyncDue(store.lastGlobalSyncAt)) {
    syncState.lastGlobalSyncAt = store.lastGlobalSyncAt;
    emit();
    return;
  }

  const entries = Object.entries(TEAM_SOFA_IDS);
  syncState = {
    running: true,
    completed: 0,
    total: entries.length,
    lastError: null,
    lastGlobalSyncAt: store.lastGlobalSyncAt,
  };
  emit();

  logger.info("Team profile daily sync started", "TeamProfileSync", { teams: entries.length });

  for (const [abbrev, sofaTeamId] of entries) {
    const existing = store.profiles[abbrev];
    if (existing && !isProfileStale(existing.fetchedAt)) {
      syncState.completed += 1;
      emit();
      continue;
    }

    try {
      await delay(SYNC_DELAY_MS);
      const profile = await fetchTeamProfileBundle(abbrev, sofaTeamId);
      store = {
        ...store,
        profiles: { ...store.profiles, [abbrev]: profile },
      };
      writeTeamProfileStore(store);
      onProfile?.(profile);
    } catch (error) {
      syncState.lastError = error instanceof Error ? error.message : String(error);
      logger.warn("Team profile sync failed", "TeamProfileSync", { abbrev, error: syncState.lastError });
    }

    syncState.completed += 1;
    emit();
  }

  store.lastGlobalSyncAt = new Date().toISOString();
  writeTeamProfileStore(store);

  syncState.running = false;
  syncState.lastGlobalSyncAt = store.lastGlobalSyncAt;
  emit();

  logger.info("Team profile daily sync finished", "TeamProfileSync", {
    completed: syncState.completed,
    total: syncState.total,
  });
}

/** Force refresh a single team (e.g. when opening detail sheet and cache is empty). */
export async function syncSingleTeamProfile(abbrev: string): Promise<TeamProfileBundle | null> {
  const key = abbrev.toUpperCase();
  const sofaTeamId = TEAM_SOFA_IDS[key];
  if (!sofaTeamId || isSofaScore6Disabled()) return null;

  const store = readTeamProfileStore();
  const existing = store.profiles[key];
  if (existing && !isProfileStale(existing.fetchedAt)) return existing;

  await delay(SYNC_DELAY_MS);
  const profile = await fetchTeamProfileBundle(key, sofaTeamId);
  const next = { ...store, profiles: { ...store.profiles, [key]: profile } };
  writeTeamProfileStore(next);
  return profile;
}

export function hydrateTeamProfilesFromCache(): Record<string, TeamProfileBundle> {
  return loadCachedProfiles();
}
