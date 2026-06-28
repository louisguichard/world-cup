import { useEffect, useState } from "react";
import type { HighlightlyHighlight } from "../types/sportHighlights";
import { fetchFifaSingleMatchVideo } from "../services/FifaFootballDataClient";
import { mapFifaClipsToHighlights } from "../services/fifaFootballData/mapFifaClipsToHighlights";

/** Cold tier — FIFA clips once per stage/match id. */
export function useFifaMatchVideos(
  stageId?: string | number,
  matchId?: string | number
): { highlights: HighlightlyHighlight[]; loading: boolean } {
  const [highlights, setHighlights] = useState<HighlightlyHighlight[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stageId == null || matchId == null) {
      setHighlights([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    setLoading(true);

    void fetchFifaSingleMatchVideo(stageId, matchId).then((clips) => {
      if (ac.signal.aborted) return;
      setHighlights(mapFifaClipsToHighlights(clips));
      setLoading(false);
    });

    return () => ac.abort();
  }, [stageId, matchId]);

  return { highlights, loading };
}
