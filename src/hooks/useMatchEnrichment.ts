import { useEffect, useState } from "react";
import type { CommentaryEntry, Lineup, MatchStatisticsBundle } from "../types";
import { DataOrchestrator } from "../services/orchestrator/DataOrchestrator";
import type { EnrichmentResult } from "../services/orchestrator/EnrichmentQueue";

type MatchEnrichmentState = {
  enrichment: EnrichmentResult | null;
  commentary: CommentaryEntry[];
  lineups: Lineup[];
  statistics: MatchStatisticsBundle | null;
  loading: boolean;
  error: string | null;
};

const INITIAL: MatchEnrichmentState = {
  enrichment: null,
  commentary: [],
  lineups: [],
  statistics: null,
  loading: false,
  error: null,
};

/** Triggers orchestrator enrichment when match detail opens. */
export function useMatchEnrichment(matchId: string | null): MatchEnrichmentState {
  const [state, setState] = useState<MatchEnrichmentState>(INITIAL);

  useEffect(() => {
    if (!matchId) {
      setState(INITIAL);
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    void DataOrchestrator.getInstance()
      .enrichMatch(matchId)
      .then((result) => {
        if (cancelled) return;
        setState({
          enrichment: result,
          commentary: result.commentary ?? [],
          lineups: result.lineups ?? [],
          statistics: result.statistics ?? null,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          ...INITIAL,
          error: err instanceof Error ? err.message : "Enrichment failed",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  return state;
}
