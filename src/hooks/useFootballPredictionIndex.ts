import { useMemo } from "react";
import { useStore } from "../store";
import { materializeFullSchedule } from "../lib/materializeFullSchedule";
import {
  buildPredictionIndex,
  lookupFootballPrediction,
} from "../lib/matchFootballPredictions";
import type { MergedMatch } from "../types";

export function useFootballPredictionIndex(): Record<
  string,
  import("../services/FootballPredictionClient").FootballPredictionMatch
> {
  const bundle = useStore((s) => s.footballPredictionBundle);
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);

  return useMemo(() => {
    if (!bundle?.dailyPredictions.length) return {};

    const schedule = materializeFullSchedule(teams, liveMatches);
    const liveIndex = buildPredictionIndex(bundle.dailyPredictions, schedule, teams);

    return { ...bundle.predictionByMatchId, ...liveIndex };
  }, [bundle, teams, liveMatches]);
}

export function useFootballPredictionForMatch(
  match: Pick<MergedMatch, "id" | "matchId" | "espnEventId"> | string
) {
  const index = useFootballPredictionIndex();
  if (typeof match === "string") {
    return index[match] ?? null;
  }
  return lookupFootballPrediction(index, match);
}
