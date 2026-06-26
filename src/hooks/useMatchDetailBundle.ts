import { useEffect, useState } from "react";
import type { Lineup, MatchStatisticsBundle, MergedMatch, CommentaryEntry } from "../types";
import { useMatchEnrichment } from "./useMatchEnrichment";
import { DataOrchestrator } from "../services/orchestrator/DataOrchestrator";
import { fetchMatchBundle } from "../services/matchDetail/fetchMatchBundle";
import { isApiEnabled } from "../config/apiFlags";
import { isWc2026LiveDisabled } from "../services/WorldCup2026LiveClient";

type BundleState = {
  statistics: MatchStatisticsBundle | null;
  lineups: Lineup[];
  commentary: CommentaryEntry[];
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
};

const INITIAL_STATE: BundleState = {
  statistics: null,
  lineups: [],
  commentary: [],
  loading: false,
  error: null,
  fetchedAt: null,
};

/** Match detail bundle — delegates to DataOrchestrator enrichment. */
export function useMatchDetailBundle(
  match: MergedMatch | null,
  wcMatchId: string | null
): BundleState & { refetch: () => void } {
  const matchId = match?.id ?? null;
  const enrichment = useMatchEnrichment(matchId);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [forceKey, setForceKey] = useState(0);

  useEffect(() => {
    if (enrichment.enrichment) {
      setFetchedAt(Date.now());
    }
  }, [enrichment.enrichment]);

  useEffect(() => {
    if (forceKey === 0 || !match) return;
    if (!isApiEnabled("wc2026Live") || isWc2026LiveDisabled()) return;

    void fetchMatchBundle(match, wcMatchId, true).then((bundle) => {
      setFetchedAt(bundle.fetchedAt);
    });
    DataOrchestrator.getInstance().clearEnrichmentCache(match.id);
    void DataOrchestrator.getInstance().enrichMatch(match.id);
  }, [forceKey, match, wcMatchId]);

  const refetch = () => setForceKey((k) => k + 1);

  return {
    statistics: enrichment.statistics,
    lineups: enrichment.lineups,
    commentary: enrichment.commentary,
    loading: enrichment.loading,
    error: enrichment.error,
    fetchedAt,
    refetch,
  };
}
