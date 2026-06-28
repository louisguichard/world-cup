import { useEffect, useMemo, useRef, useState } from "react";
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
  const homeTeamRef = useRef(input.homeTeam);
  const awayTeamRef = useRef(input.awayTeam);
  homeTeamRef.current = input.homeTeam;
  awayTeamRef.current = input.awayTeam;

  const playerEvents = useMemo(
    () =>
      input.events.filter(
        (e) =>
          e.playerName.trim().length > 0 ||
          (e.assistName?.trim() && (e.type === "goal" || e.type === "own_goal"))
      ),
    [input.events]
  );

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
    const sync = resolveEventPhotosSync(playerEvents);
    setPhotos((prev) => {
      const prevKeys = Object.keys(prev);
      const syncKeys = Object.keys(sync);
      if (
        prevKeys.length === syncKeys.length &&
        syncKeys.every((key) => prev[key] === sync[key])
      ) {
        return prev;
      }
      return sync;
    });

    if (playerEvents.length === 0) return;

    let cancelled = false;
    void enrichEventPlayerPhotos({
      events: playerEvents,
      homeTeam: homeTeamRef.current,
      awayTeam: awayTeamRef.current,
    }).then((enriched) => {
      if (!cancelled) {
        setPhotos((prev) => {
          const keys = Object.keys(enriched);
          if (
            keys.length === Object.keys(prev).length &&
            keys.every((key) => prev[key] === enriched[key])
          ) {
            return prev;
          }
          return enriched;
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [eventKey, homeTeamId, awayTeamId, playerEvents]);

  return photos;
}
