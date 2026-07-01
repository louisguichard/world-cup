import { useDeferredValue, useMemo } from "react";
import { buildCanonicalTournamentDataset } from "../lib/canonicalTournamentDataset";
import { buildBracketViewModel } from "../lib/brackets/buildBracketViewModel";
import { buildQualificationContext } from "../lib/qualification";
import type { MergedMatch, TournamentProjection } from "../types";
import { buildScheduleOverlayFingerprint } from "../store/selectors/scheduleSelectors";
import { useStore } from "../store";

type BracketProjection = Pick<TournamentProjection, "bracket" | "standings">;

/**
 * Knockout bracket for Live context panel — locked official results plus live overlay only.
 */
export function useBracketProjection(
  enabled: boolean,
  mergedSchedule: MergedMatch[]
): BracketProjection | null {
  const liveMatches = useStore((s) => s.liveMatches);
  const inputFingerprint = useStore((s) =>
    buildScheduleOverlayFingerprint(s.liveMatches, s.groupStandings)
  );

  const canonical = useMemo(() => {
    const store = useStore.getState();
    return buildCanonicalTournamentDataset({
      teams: store.teams,
      liveMatches: store.liveMatches,
      knockoutMarkets: store.knockoutMarkets,
    });
  }, [inputFingerprint]);

  const qualContext = useMemo(
    () => buildQualificationContext(canonical.matches, canonical.teams),
    [canonical.matches, canonical.teams]
  );

  const deferredMergedSchedule = useDeferredValue(mergedSchedule);

  return useMemo(() => {
    if (!enabled || !canonical.teams.length) return null;

    return buildBracketViewModel({
      mode: "confirmed",
      context: "live",
      teams: canonical.teams,
      matches: canonical.matches,
      liveMatches,
      qualContext,
      mergedSchedule: deferredMergedSchedule,
    });
  }, [
    enabled,
    canonical.teams,
    canonical.matches,
    liveMatches,
    qualContext,
    deferredMergedSchedule,
    inputFingerprint,
  ]);
}
