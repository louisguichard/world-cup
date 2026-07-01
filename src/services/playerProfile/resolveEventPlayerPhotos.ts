import type { MatchEvent, Team } from "../../types";
import { isApiEnabled } from "../../config/apiFlags";
import {
  fetchTeamPlayers,
  getWc2026TeamIdFromCache,
  isWorldCup2026Disabled,
  lookupWc2026Player,
  resolveWc2026TeamId,
  type Wc2026Player,
} from "../WorldCup2026Client";
import { hydratePlayerImageFromDatabase, ensurePlayerDatabase } from "../../data/playerDatabase";
import { imageAssetService, ensurePaninarrCatalogLoaded } from "../paninarr/ImageAssetService";
import { lookupIconicPlayerPhotoAsync } from "../iconicFootball/IconicFootballClient";
import { resolveCanonicalTeamId } from "../../data/wc2026TeamCatalog";
import { matchPlayerInRoster } from "./matchPlayerInRoster";

const resolvedPhotoCache = new Map<string, string>();
const enrichFailedNames = new Set<string>();

export function mergePhotoMaps(
  prev: Record<string, string | undefined>,
  next: Record<string, string | undefined>
): Record<string, string | undefined> {
  const merged = { ...prev };
  let changed = false;
  for (const [key, value] of Object.entries(next)) {
    if (value && merged[key] !== value) {
      merged[key] = value;
      changed = true;
    } else if (!merged[key] && value) {
      merged[key] = value;
      changed = true;
    }
  }
  return changed ? merged : prev;
}

function cachePhotoKey(playerId: string | undefined, playerName: string): string {
  return playerId ? `id:${playerId}` : `name:${playerName.trim().toLowerCase()}`;
}

function rememberPhoto(playerId: string | undefined, playerName: string, url: string | undefined): string | undefined {
  if (!url) return undefined;
  resolvedPhotoCache.set(cachePhotoKey(playerId, playerName), url);
  return url;
}

function recallPhoto(playerId: string | undefined, playerName: string): string | undefined {
  return resolvedPhotoCache.get(cachePhotoKey(playerId, playerName));
}

export function photoUrlFromPlayer(player?: Wc2026Player): string | undefined {
  const image = player?.image;
  return typeof image === "string" && image.trim() ? image.trim() : undefined;
}

function photoFromPaninarr(
  playerId: string | undefined,
  playerName: string,
  teamId?: string
): string | undefined {
  const asset = imageAssetService.getPlayerHeadshot({
    teamId: teamId ? resolveCanonicalTeamId(teamId) : undefined,
    playerName,
  });
  return asset?.imageUrl ? rememberPhoto(playerId, playerName, asset.imageUrl) : undefined;
}

function photoForPlayer(playerId: string | undefined, playerName: string, teamId?: string): string | undefined {
  const cached = recallPhoto(playerId, playerName);
  if (cached) return cached;

  const fromIndex = lookupWc2026Player({ playerId, playerName });
  const fromWc = photoUrlFromPlayer(fromIndex);
  if (fromWc) return rememberPhoto(playerId, playerName, fromWc);

  return photoFromPaninarr(playerId, playerName, teamId);
}

function photoForEvent(event: MatchEvent): string | undefined {
  return photoForPlayer(event.playerId, event.playerName, event.teamId);
}

/** Sync portrait lookup — WC2026 index, Panini catalog, in-memory cache. */
export function resolvePlayerPhotoUrlSync(
  playerName: string,
  teamId?: string,
  playerId?: string
): string | undefined {
  return photoForPlayer(playerId, playerName, teamId);
}

/** Async enrichment — static player DB, Panini load, iconic fallback. */
export async function enrichPlayerPhotoUrl(
  playerName: string,
  teamId?: string,
  playerId?: string
): Promise<string | undefined> {
  const sync = resolvePlayerPhotoUrlSync(playerName, teamId, playerId);
  if (sync) return sync;

  await ensurePlayerDatabase();
  const hydrated = await hydratePlayerImageFromDatabase(playerName);
  if (hydrated) return rememberPhoto(playerId, playerName, hydrated);

  await ensurePaninarrCatalogLoaded();
  const panini = photoFromPaninarr(playerId, playerName, teamId);
  if (panini) return panini;

  const iconic = await lookupIconicPlayerPhotoAsync(playerName);
  return iconic ? rememberPhoto(playerId, playerName, iconic) : undefined;
}

export function assistPhotoKey(providerId: string): string {
  return `${providerId}::assist`;
}

/** Instant lookup from local WC2026 player index (no network). */
export function resolveEventPhotosSync(events: MatchEvent[]): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const event of events) {
    out[event.providerId] = photoForEvent(event);
    if (
      event.assistName?.trim() &&
      (event.type === "goal" || event.type === "own_goal")
    ) {
      out[assistPhotoKey(event.providerId)] = photoForPlayer(undefined, event.assistName, event.teamId);
    }
  }
  return out;
}

async function resolveWcTeamId(team: Team | undefined): Promise<string | undefined> {
  if (!team) return undefined;
  if (team.wc2026TeamId) return team.wc2026TeamId;
  return resolveWc2026TeamId(team.abbreviation);
}

async function enrichFromStaticDatabase(
  events: MatchEvent[],
  photos: Record<string, string | undefined>
): Promise<void> {
  const names = new Set<string>();
  for (const event of events) {
    if (!photos[event.providerId] && event.playerName.trim()) {
      if (!enrichFailedNames.has(event.playerName)) names.add(event.playerName);
    }
    const assistKey = assistPhotoKey(event.providerId);
    if (
      event.assistName?.trim() &&
      (event.type === "goal" || event.type === "own_goal") &&
      !photos[assistKey] &&
      !enrichFailedNames.has(event.assistName)
    ) {
      names.add(event.assistName);
    }
  }

  if (names.size === 0) return;

  await Promise.all(
    [...names].map(async (name) => {
      const url = await hydratePlayerImageFromDatabase(name);
      if (!url) return;
      rememberPhoto(undefined, name, url);
      for (const event of events) {
        if (!photos[event.providerId] && event.playerName === name) {
          photos[event.providerId] = url;
        }
        const assistKey = assistPhotoKey(event.providerId);
        if (
          event.assistName === name &&
          (event.type === "goal" || event.type === "own_goal") &&
          !photos[assistKey]
        ) {
          photos[assistKey] = url;
        }
      }
    })
  );
}

function enrichFromPaninarr(
  events: MatchEvent[],
  photos: Record<string, string | undefined>
): void {
  for (const event of events) {
    if (!photos[event.providerId] && event.playerName.trim()) {
      const url = photoFromPaninarr(event.playerId, event.playerName, event.teamId);
      if (url) photos[event.providerId] = url;
    }

    const assistKey = assistPhotoKey(event.providerId);
    if (
      event.assistName?.trim() &&
      (event.type === "goal" || event.type === "own_goal") &&
      !photos[assistKey]
    ) {
      const assistUrl = photoFromPaninarr(undefined, event.assistName, event.teamId);
      if (assistUrl) photos[assistKey] = assistUrl;
    }
  }
}

async function enrichFromPaninarrAsync(
  events: MatchEvent[],
  photos: Record<string, string | undefined>
): Promise<void> {
  await ensurePaninarrCatalogLoaded();
  enrichFromPaninarr(events, photos);
}

async function enrichFromIconicFootball(
  events: MatchEvent[],
  photos: Record<string, string | undefined>
): Promise<void> {
  for (const event of events) {
    if (!photos[event.providerId] && event.playerName.trim()) {
      const url = await lookupIconicPlayerPhotoAsync(event.playerName);
      if (url) photos[event.providerId] = rememberPhoto(event.playerId, event.playerName, url);
    }

    const assistKey = assistPhotoKey(event.providerId);
    if (
      event.assistName?.trim() &&
      (event.type === "goal" || event.type === "own_goal") &&
      !photos[assistKey]
    ) {
      const assistUrl = await lookupIconicPlayerPhotoAsync(event.assistName);
      if (assistUrl) photos[assistKey] = rememberPhoto(undefined, event.assistName, assistUrl);
    }
  }
}

function applyRoster(
  events: MatchEvent[],
  roster: Wc2026Player[],
  photos: Record<string, string | undefined>
): void {
  for (const event of events) {
    if (!photos[event.providerId]) {
      const player = matchPlayerInRoster(roster, {
        playerId: event.playerId,
        playerName: event.playerName,
      });
      const url = photoUrlFromPlayer(player);
      if (url) {
        photos[event.providerId] = rememberPhoto(event.playerId, event.playerName, url);
      }
    }

    const assistKey = assistPhotoKey(event.providerId);
    if (
      event.assistName?.trim() &&
      (event.type === "goal" || event.type === "own_goal") &&
      !photos[assistKey]
    ) {
      const assister = matchPlayerInRoster(roster, { playerName: event.assistName });
      const assistUrl = photoUrlFromPlayer(assister);
      if (assistUrl) {
        photos[assistKey] = rememberPhoto(undefined, event.assistName, assistUrl);
      }
    }
  }
}

/** Fills missing portraits from team rosters (`players[].image`). */
export async function enrichEventPlayerPhotos(input: {
  events: MatchEvent[];
  homeTeam?: Team;
  awayTeam?: Team;
}): Promise<Record<string, string | undefined>> {
  const photos = resolveEventPhotosSync(input.events);
  const playerEvents = input.events.filter((e) => e.playerName.trim().length > 0);
  if (playerEvents.length === 0) return photos;

  const needsFetch = playerEvents.some((e) => {
    if (e.playerName.trim() && !photos[e.providerId] && !enrichFailedNames.has(e.playerName)) return true;
    if (
      e.assistName?.trim() &&
      (e.type === "goal" || e.type === "own_goal") &&
      !photos[assistPhotoKey(e.providerId)] &&
      !enrichFailedNames.has(e.assistName)
    ) {
      return true;
    }
    return false;
  });
  if (!needsFetch) return photos;

  await ensurePlayerDatabase();
  await enrichFromStaticDatabase(playerEvents, photos);
  await enrichFromPaninarrAsync(playerEvents, photos);
  await enrichFromIconicFootball(playerEvents, photos);

  const stillNeedsFetch = playerEvents.some((e) => {
    if (e.playerName.trim() && !photos[e.providerId]) return true;
    if (
      e.assistName?.trim() &&
      (e.type === "goal" || e.type === "own_goal") &&
      !photos[assistPhotoKey(e.providerId)]
    ) {
      return true;
    }
    return false;
  });
  if (!stillNeedsFetch) return photos;

  const canFetchRoster = isApiEnabled("wc2026Teams") && !isWorldCup2026Disabled();
  if (!canFetchRoster) return photos;

  const teamIds = new Set(playerEvents.map((e) => e.teamId));
  const rosterByTeamId = new Map<string, Wc2026Player[]>();

  await Promise.all(
    [...teamIds].map(async (teamId) => {
      const team = teamId === input.homeTeam?.id ? input.homeTeam : input.awayTeam;
      const wcId =
        team?.wc2026TeamId ??
        (team ? getWc2026TeamIdFromCache(team.abbreviation) : undefined) ??
        (await resolveWcTeamId(team));
      if (!wcId) {
        rosterByTeamId.set(teamId, []);
        return;
      }
      rosterByTeamId.set(teamId, await fetchTeamPlayers(wcId));
    })
  );

  for (const teamId of teamIds) {
    const roster = rosterByTeamId.get(teamId) ?? [];
    const teamEvents = playerEvents.filter((e) => e.teamId === teamId);
    applyRoster(teamEvents, roster, photos);
  }

  for (const event of playerEvents) {
    if (!photos[event.providerId] && event.playerName.trim()) {
      enrichFailedNames.add(event.playerName);
    }
    const assistKey = assistPhotoKey(event.providerId);
    if (
      event.assistName?.trim() &&
      (event.type === "goal" || event.type === "own_goal") &&
      !photos[assistKey]
    ) {
      enrichFailedNames.add(event.assistName);
    }
  }

  return photos;
}
