import { useMemo } from "react";
import { useStore } from "../store";
import { materializeFullSchedule } from "../lib/materializeFullSchedule";
import { buildPredictionIndex } from "../lib/matchFootballPredictions";

export function useFootballPredictionIndex(): Record<string, import("../services/FootballPredictionClient").FootballPredictionMatch> {
  const bundle = useStore((s) => s.footballPredictionBundle);
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);

  return useMemo(() => {
    if (!bundle?.dailyPredictions.length) return {};
    const schedule = materializeFullSchedule(teams, liveMatches);
    return buildPredictionIndex(bundle.dailyPredictions, schedule, teams);
  }, [bundle, teams, liveMatches]);
}

export function useFootballPredictionForMatch(matchId: string) {
  const index = useFootballPredictionIndex();
  return index[matchId] ?? null;
}
