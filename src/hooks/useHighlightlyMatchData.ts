import { useEffect, useState } from "react";
import type { MergedMatch, Team } from "../types";
import type { HighlightlyMatchBundle } from "../types/sportHighlights";
import { fetchHighlightlyMatchBundle } from "../services/matchDetail/fetchHighlightlyMatchBundle";

const EMPTY: HighlightlyMatchBundle = {
  highlightlyMatchId: null,
  matchDetail: null,
  statistics: [],
  highlights: [],
  liveEvents: [],
  lineups: null,
  lastFiveHome: [],
  lastFiveAway: [],
  head2Head: [],
  fetchedAt: 0,
};

/** Cold tier — Highlightly bundle once per match open (no interval polling). */
export function useHighlightlyMatchData(
  match: MergedMatch | null,
  homeTeam?: Team,
  awayTeam?: Team
): HighlightlyMatchBundle & { loading: boolean } {
  const [bundle, setBundle] = useState<HighlightlyMatchBundle>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!match) {
      setBundle(EMPTY);
      return;
    }

    const ac = new AbortController();
    setLoading(true);

    void fetchHighlightlyMatchBundle({ match, homeTeam, awayTeam, detailView: true }).then((result) => {
      if (ac.signal.aborted) return;
      setBundle(result);
      setLoading(false);
    });

    return () => ac.abort();
  }, [match?.id, match?.date, match?.status, homeTeam?.id, awayTeam?.id, match?.homeScore, match?.awayScore]);

  return { ...bundle, loading };
}
