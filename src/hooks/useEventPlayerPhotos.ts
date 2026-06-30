import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchEvent, Team } from "../types";
import {
  enrichEventPlayerPhotos,
  mergePhotoMaps,
  resolveEventPhotosSync,
} from "../services/playerProfile/resolveEventPlayerPhotos";

type Input = {
  events: MatchEvent[];
  homeTeam?: Team;
  awayTeam?: Team;
};

function filterPlayerEvents(events: MatchEvent[]): MatchEvent[] {
  return events.filter(
    (e) =>
      e.playerName.trim().length > 0 ||
      (e.assistName?.trim() && (e.type === "goal" || e.type === "own_goal"))
  );
}

export function useEventPlayerPhotos(input: Input): Record<string, string | undefined> {
  const homeTeamRef = useRef(input.homeTeam);
  const awayTeamRef = useRef(input.awayTeam);
  const playerEventsRef = useRef<MatchEvent[]>([]);
  homeTeamRef.current = input.homeTeam;
  awayTeamRef.current = input.awayTeam;

  const playerEvents = useMemo(() => filterPlayerEvents(input.events), [input.events]);
  playerEventsRef.current = playerEvents;

  const eventKey = useMemo(
    () =>
      playerEvents
        .map((e) => `${e.providerId}:${e.playerName}:${e.teamId}`)
        .join("|"),
    [playerEvents]
  );

  const homeTeamId = input.homeTeam?.id;
  const awayTeamId = input.awayTeam?.id;

  const [photos, setPhotos] = useState<Record<string, string | undefined>>(() =>
    resolveEventPhotosSync(playerEvents)
  );

  useEffect(() => {
    const events = playerEventsRef.current;
    if (events.length === 0) return;

    const sync = resolveEventPhotosSync(events);
    setPhotos((prev) => mergePhotoMaps(prev, sync));

    let cancelled = false;
    void enrichEventPlayerPhotos({
      events,
      homeTeam: homeTeamRef.current,
      awayTeam: awayTeamRef.current,
    }).then((enriched) => {
      if (!cancelled) {
        setPhotos((prev) => mergePhotoMaps(prev, enriched));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [eventKey, homeTeamId, awayTeamId]);

  return photos;
}
