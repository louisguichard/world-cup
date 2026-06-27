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

    let cancelled = false;
    setLoading(true);

    void fetchHighlightlyMatchBundle({ match, homeTeam, awayTeam, detailView: true }).then((result) => {
      if (!cancelled) {
        setBundle(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [match?.id, match?.date, match?.status, homeTeam?.id, awayTeam?.id, match?.homeScore, match?.awayScore]);

  return { ...bundle, loading };
}
