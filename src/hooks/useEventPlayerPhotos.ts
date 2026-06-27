import { useEffect, useMemo, useState } from "react";
import type { MatchEvent, Team } from "../types";
import {
  enrichEventPlayerPhotos,
  resolveEventPhotosSync,
} from "../services/playerProfile/resolveEventPlayerPhotos";

type Input = {
  events: MatchEvent[];
  homeTeam?: Team;
  awayTeam?: Team;
};

export function useEventPlayerPhotos(input: Input): Record<string, string | undefined> {
  const playerEvents = useMemo(
    () => input.events.filter((e) => e.playerName.trim().length > 0),
    [input.events]
  );

  const eventKey = useMemo(
    () =>
      playerEvents
        .map((e) => `${e.providerId}:${e.playerName}:${e.teamId}`)
        .join("|"),
    [playerEvents]
  );

  const [photos, setPhotos] = useState<Record<string, string | undefined>>(() =>
    resolveEventPhotosSync(playerEvents)
  );

  useEffect(() => {
    const sync = resolveEventPhotosSync(playerEvents);
    setPhotos(sync);

    if (playerEvents.length === 0) return;

    let cancelled = false;
    void enrichEventPlayerPhotos({
      events: playerEvents,
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
    }).then((enriched) => {
      if (!cancelled) setPhotos(enriched);
    });

    return () => {
      cancelled = true;
    };
  }, [eventKey, input.homeTeam, input.awayTeam, playerEvents]);

  return photos;
}
