import { useEffect, useMemo, useState } from "react";
import type { GoalScorerProfile, MatchEvent, Team } from "../types";
import {
  resolveGoalScorerProfiles,
  resolveGoalScorerProfilesSync,
} from "../services/playerProfile/resolveGoalScorerProfiles";

type Input = {
  events: MatchEvent[];
  homeTeam?: Team;
  awayTeam?: Team;
  allMatchEvents: Record<string, MatchEvent[]>;
};

export function useGoalScorerProfiles(input: Input): {
  profiles: GoalScorerProfile[];
  loading: boolean;
} {
  const goalEvents = useMemo(
    () => input.events.filter((e) => e.type === "goal" || e.type === "own_goal"),
    [input.events]
  );

  const syncProfiles = useMemo(
    () =>
      resolveGoalScorerProfilesSync({
        events: input.events,
        allMatchEvents: input.allMatchEvents,
      }),
    [input.events, input.allMatchEvents]
  );

  const [profiles, setProfiles] = useState<GoalScorerProfile[]>(syncProfiles);
  const [loading, setLoading] = useState(false);

  const goalKey = useMemo(
    () =>
      goalEvents
        .map((e) => `${e.providerId}:${e.playerName}:${e.minute}`)
        .join("|"),
    [goalEvents]
  );

  useEffect(() => {
    if (goalEvents.length === 0) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    setProfiles(syncProfiles);

    let cancelled = false;
    setLoading(true);

    resolveGoalScorerProfiles({
      events: input.events,
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      allMatchEvents: input.allMatchEvents,
    })
      .then((result) => {
        if (!cancelled) setProfiles(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [goalKey, input.events, input.homeTeam, input.awayTeam, input.allMatchEvents, goalEvents.length, syncProfiles]);

  return { profiles, loading };
}
