import { useEffect, useState } from "react";
import {
  enrichPlayerPhotoUrl,
  resolvePlayerPhotoUrlSync,
} from "../services/playerProfile/resolveEventPlayerPhotos";

/** Panini / WC2026 / static DB portrait — same pipeline as live goal scorers. */
export function useEnrichedPlayerPhoto(
  playerName: string,
  teamId?: string,
  playerId?: string
): string | undefined {
  const lookupKey = `${playerId ?? ""}|${teamId ?? ""}|${playerName}`;

  const [photoUrl, setPhotoUrl] = useState<string | undefined>(() =>
    resolvePlayerPhotoUrlSync(playerName, teamId, playerId)
  );

  useEffect(() => {
    const sync = resolvePlayerPhotoUrlSync(playerName, teamId, playerId);
    setPhotoUrl(sync);
    if (sync) return undefined;

    let cancelled = false;
    void enrichPlayerPhotoUrl(playerName, teamId, playerId).then((url) => {
      if (!cancelled && url) setPhotoUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [lookupKey, playerId, playerName, teamId]);

  return photoUrl;
}
