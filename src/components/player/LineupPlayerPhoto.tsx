import type { PlayerRef } from "../../types";
import { useGettyPlayerPhoto } from "../../hooks/useGettyWorldCupImages";
import { resolveLineupPlayerPhoto } from "../../lib/resolveLineupPlayerPhoto";
import { PlayerPhoto, type PlayerPhotoSize } from "./PlayerPhoto";

type Props = {
  player: PlayerRef;
  size?: PlayerPhotoSize;
  className?: string;
};

/** Lineup portrait — roster/ESPN first, Getty editorial fallback. */
export function LineupPlayerPhoto({ player, size = "sm", className }: Props) {
  const rosterPhoto = resolveLineupPlayerPhoto(player);
  const getty = useGettyPlayerPhoto(rosterPhoto ? undefined : player.displayName);
  const photoUrl = rosterPhoto ?? getty.image?.url;

  return (
    <PlayerPhoto
      name={player.displayName}
      photoUrl={photoUrl}
      size={size}
      className={className}
      loading={!photoUrl && getty.loading}
    />
  );
}
