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
import { matchPlayerInRoster } from "./matchPlayerInRoster";

export function photoUrlFromPlayer(player?: Wc2026Player): string | undefined {
  const image = player?.image;
  return typeof image === "string" && image.trim() ? image.trim() : undefined;
}

function photoForEvent(event: MatchEvent): string | undefined {
  const fromIndex = lookupWc2026Player({
    playerId: event.playerId,
    playerName: event.playerName,
  });
  return photoUrlFromPlayer(fromIndex);
}

/** Instant lookup from local WC2026 player index (no network). */
export function resolveEventPhotosSync(events: MatchEvent[]): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const event of events) {
    out[event.providerId] = photoForEvent(event);
  }
  return out;
}

async function resolveWcTeamId(team: Team | undefined): Promise<string | undefined> {
  if (!team) return undefined;
  if (team.wc2026TeamId) return team.wc2026TeamId;
  return resolveWc2026TeamId(team.abbreviation);
}

function applyRoster(
  events: MatchEvent[],
  roster: Wc2026Player[],
  photos: Record<string, string | undefined>
): void {
  for (const event of events) {
    if (photos[event.providerId]) continue;
    const player = matchPlayerInRoster(roster, {
      playerId: event.playerId,
      playerName: event.playerName,
    });
    const url = photoUrlFromPlayer(player);
    if (url) photos[event.providerId] = url;
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

  const needsFetch = playerEvents.some((e) => !photos[e.providerId]);
  if (!needsFetch) return photos;

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

  return photos;
}
