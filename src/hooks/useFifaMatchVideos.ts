import { useEffect, useState } from "react";
import type { HighlightlyHighlight } from "../types/sportHighlights";
import { fetchFifaSingleMatchVideo } from "../services/FifaFootballDataClient";
import { mapFifaClipsToHighlights } from "../services/fifaFootballData/mapFifaClipsToHighlights";

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

    let cancelled = false;
    setLoading(true);

    void fetchFifaSingleMatchVideo(stageId, matchId).then((clips) => {
      if (cancelled) return;
      setHighlights(mapFifaClipsToHighlights(clips));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [stageId, matchId]);

  return { highlights, loading };
}
