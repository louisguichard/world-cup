import type { PlayerRef } from "../../types";
import type { IconicFootballPlayer, IconicPlayerRef } from "./types";

export function mapIconicPlayerToRef(player: IconicFootballPlayer): IconicPlayerRef {
  return {
    id: `iconic-${player.id}`,
    displayName: player.full_name,
    headshotUrl: player.img,
    primeRating: player.prime_rating,
    primePosition: player.prime_position,
    primeSeason: player.prime_season,
    clubName: player.club?.name,
    countryName: player.country?.name,
  };
}

export function mapIconicPlayerToPlayerRef(player: IconicFootballPlayer): PlayerRef {
  return {
    id: `iconic-${player.id}`,
    displayName: player.full_name,
    headshotUrl: player.img.trim() || undefined,
    position: player.prime_position,
  };
}
