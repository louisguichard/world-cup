import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { buildCanonicalTournamentDataset } from "../lib/canonicalTournamentDataset";
import { buildQualificationContext } from "../lib/qualification";
import { projectTournament } from "../lib/tournament";
import type { MergedMatch, TournamentProjection } from "../types";
import { buildScheduleOverlayFingerprint } from "../store/selectors/scheduleSelectors";
import { useStore } from "../store";

type BracketProjection = Pick<TournamentProjection, "bracket" | "standings">;

/**
 * Knockout bracket projection for Live context panel.
 * Deferred effect — does not block tab chrome on poll ticks.
 */
export function useBracketProjection(
  enabled: boolean,
  mergedSchedule: MergedMatch[]
): BracketProjection | null {
  const markets = useStore((s) => s.knockoutMarkets);
  const overrides = useStore((s) => s.scoreOverrides);
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
  }, [inputFingerprint, markets]);

  const qualContext = useMemo(
    () => buildQualificationContext(canonical.matches, canonical.teams),
    [canonical.matches, canonical.teams]
  );

  const projectionMatches = useMemo(
    () =>
      canonical.matches.filter((m) => {
        if (m.group) return true;
        return m.homeScore !== undefined && m.awayScore !== undefined;
      }) as Parameters<typeof projectTournament>[1],
    [canonical.matches]
  );

  const deferredProjectionMatches = useDeferredValue(projectionMatches);
  const [, startTransition] = useTransition();
  const [projection, setProjection] = useState<BracketProjection | null>(null);

  useEffect(() => {
    if (!enabled || !canonical.teams.length) {
      setProjection(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const result = projectTournament(
        canonical.teams,
        deferredProjectionMatches,
        markets,
        overrides,
        {},
        qualContext.lockedGroupMatchCount,
        qualContext.lockedStandingsByGroup,
        mergedSchedule
      );

      startTransition(() => {
        if (!cancelled) setProjection(result);
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    enabled,
    canonical.teams,
    deferredProjectionMatches,
    markets,
    overrides,
    qualContext.lockedGroupMatchCount,
    qualContext.lockedStandingsByGroup,
    mergedSchedule,
  ]);

  return enabled ? projection : null;
}
