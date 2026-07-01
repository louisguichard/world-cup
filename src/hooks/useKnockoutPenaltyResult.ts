import { useEffect, useMemo, useState } from "react";
import type { MergedMatch, PenaltyShootout } from "../types";
import { resolveBracketMatchId } from "../lib/bracketTree";
import { derivePenaltyShootout, isKnockoutPenaltyDecided } from "../lib/derivePenaltyShootout";
import {
  fetchZafronixPenaltyShootout,
  needsZafronixPenaltyFetch,
} from "../lib/fetchKnockoutPenaltyResult";
import { getKnockoutStageLabel } from "../lib/resultsGrouping";
import { resolveEventsForMatch } from "../lib/resolveMatchEvents";
import { resolveMatchWinner } from "../lib/resolveMatchWinner";
import { useStore } from "../store";

export type KnockoutPenaltyResult = {
  showPenalties: boolean;
  shootout: PenaltyShootout | undefined;
  winnerTeamId: string | undefined;
  stageLabel: string | undefined;
  loading: boolean;
};

export function useKnockoutPenaltyResult(match: MergedMatch): KnockoutPenaltyResult {
  const teams = useStore((s) => s.teams);
  const matchEvents = useStore((s) => s.matchEvents);
  const [fetchedShootout, setFetchedShootout] = useState<PenaltyShootout | undefined>();
  const [loading, setLoading] = useState(false);

  const events = useMemo(
    () => resolveEventsForMatch(match, matchEvents, teams),
    [match, matchEvents, teams]
  );

  const derivedShootout = useMemo(
    () =>
      derivePenaltyShootout({
        events,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        period: match.period,
        decidedByPenalties: match.decidedByPenalties,
        existing: match.penaltyShootout,
      }),
    [events, match]
  );

  const shootout = derivedShootout ?? fetchedShootout;
  const showPenalties = isKnockoutPenaltyDecided(match, shootout);
  const winnerTeamId = useMemo(
    () => (showPenalties ? resolveMatchWinner(match, teams, shootout) : undefined),
    [match, teams, shootout, showPenalties]
  );
  const stageLabel = useMemo(
    () => (showPenalties ? getKnockoutStageLabel(match) : undefined),
    [match, showPenalties]
  );

  useEffect(() => {
    setFetchedShootout(undefined);
    setLoading(false);
  }, [match.id, match.matchId, match.penaltyShootout]);

  const officialMatchId = match.matchId ?? resolveBracketMatchId(match) ?? undefined;

  useEffect(() => {
    if (derivedShootout || !needsZafronixPenaltyFetch({ ...match, matchId: officialMatchId })) {
      return;
    }
    if (!officialMatchId) return;

    let cancelled = false;
    setLoading(true);
    void fetchZafronixPenaltyShootout(officialMatchId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result) setFetchedShootout(result);
    });

    return () => {
      cancelled = true;
    };
  }, [derivedShootout, match, officialMatchId]);

  return { showPenalties, shootout, winnerTeamId, stageLabel, loading: loading && !shootout };
}
