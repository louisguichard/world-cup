import type { PlayerRef } from "../types";
import { getPlayerPhotoUrl, lookupWc2026Player } from "../services/WorldCup2026Client";
import { photoUrlFromPlayer } from "../services/playerProfile/resolveEventPlayerPhotos";

/** Portrait URL for lineup rows — headshot from feed, else WC2026 roster `image`. */
export function resolveLineupPlayerPhoto(player: PlayerRef): string | undefined {
  const headshot = player.headshotUrl?.trim();
  if (headshot) return headshot;

  const fromId = getPlayerPhotoUrl(player.id);
  if (fromId) return fromId;

  const fromRoster = lookupWc2026Player({
    playerId: player.id,
    playerName: player.displayName,
  });
  return photoUrlFromPlayer(fromRoster);
}
