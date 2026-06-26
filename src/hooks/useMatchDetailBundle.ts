import { useCallback, useEffect, useRef, useState } from "react";
import { isApiEnabled } from "../config/apiFlags";
import type { Lineup, MatchStatisticsBundle, MergedMatch } from "../types";
import type { WcCommentaryEntry } from "../services/WorldCup2026LiveClient";
import { isWc2026LiveDisabled } from "../services/WorldCup2026LiveClient";
import { fetchMatchBundle, type MatchBundle } from "../services/matchDetail/fetchMatchBundle";

type BundleState = {
  statistics: MatchStatisticsBundle | null;
  lineups: Lineup[];
  commentary: WcCommentaryEntry[];
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
  fetchedAt: null
};

export function useMatchDetailBundle(
  match: MergedMatch | null,
  wcMatchId: string | null
): BundleState & { refetch: () => void } {
  const [state, setState] = useState<BundleState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(
    async (force = false) => {
      if (!match) return;
      if (!isApiEnabled("wc2026Live") || isWc2026LiveDisabled()) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const bundle: MatchBundle = await fetchMatchBundle(match, wcMatchId, force);
        setState({
          statistics: bundle.statistics,
          lineups: bundle.lineups,
          commentary: bundle.commentary,
          loading: false,
          error: null,
          fetchedAt: bundle.fetchedAt
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load match data"
        }));
      }
    },
    [match, wcMatchId]
  );

  // Fetch on mount and when match/wcMatchId changes
  useEffect(() => {
    void fetch(false);
    return () => abortRef.current?.abort();
  }, [fetch]);

  const refetch = useCallback(() => { void fetch(true); }, [fetch]);

  return { ...state, refetch };
}
