import type { PlayerRef } from "../types";
import { resolveCanonicalTeamId } from "../data/wc2026TeamCatalog";
import { getPlayerPhotoUrl, lookupWc2026Player } from "../services/WorldCup2026Client";
import { imageAssetService, ensurePaninarrCatalogLoaded } from "../services/paninarr/ImageAssetService";
import { lookupIconicPlayerPhoto, lookupIconicPlayerPhotoAsync } from "../services/iconicFootball/IconicFootballClient";
import { photoUrlFromPlayer } from "../services/playerProfile/resolveEventPlayerPhotos";

/** Portrait URL for lineup rows — headshot from feed, else WC2026 roster, else Paninarr. */
export function resolveLineupPlayerPhoto(player: PlayerRef, teamId?: string): string | undefined {
  const headshot = player.headshotUrl?.trim();
  if (headshot) return headshot;

  const fromId = getPlayerPhotoUrl(player.id);
  if (fromId) return fromId;

  const fromRoster = lookupWc2026Player({
    playerId: player.id,
    playerName: player.displayName,
  });
  const fromWc = photoUrlFromPlayer(fromRoster);
  if (fromWc) return fromWc;

  const canonicalTeam = teamId ? resolveCanonicalTeamId(teamId) : undefined;
  const fromPaninarr = imageAssetService.getPlayerHeadshot({
    teamId: canonicalTeam,
    playerName: player.displayName,
  })?.imageUrl;
  if (fromPaninarr) return fromPaninarr;

  return lookupIconicPlayerPhoto(player.displayName);
}

/** Async lineup portrait with Paninarr catalog warm-up. */
export async function resolveLineupPlayerPhotoAsync(
  player: PlayerRef,
  teamId?: string
): Promise<string | undefined> {
  const sync = resolveLineupPlayerPhoto(player, teamId);
  if (sync) return sync;
  await ensurePaninarrCatalogLoaded();
  const fromPaninarr = resolveLineupPlayerPhoto(player, teamId);
  if (fromPaninarr) return fromPaninarr;

  return lookupIconicPlayerPhotoAsync(player.displayName);
}
