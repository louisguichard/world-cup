import { useEffect, useState } from "react";
import type { MergedMatch, Team } from "../types";
import type { YouTubeMatchVideo } from "../types/youtubeHighlights";
import { resolveYouTubeMatchVideos } from "../services/YouTubeMatchHighlightsClient";

type Input = {
  match: MergedMatch | null;
  homeTeam?: Team;
  awayTeam?: Team;
  homeTeamName: string;
  awayTeamName: string;
};

/** Cold tier — resolve YouTube clips once when match context is set. */
export function useYouTubeMatchVideos(input: Input): {
  videos: YouTubeMatchVideo[];
  loading: boolean;
} {
  const [videos, setVideos] = useState<YouTubeMatchVideo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input.match) {
      setVideos([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    setLoading(true);

    void resolveYouTubeMatchVideos({
      match: input.match,
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      homeTeamName: input.homeTeamName,
      awayTeamName: input.awayTeamName,
    })
      .then((result) => {
        if (!ac.signal.aborted) setVideos(result);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [
    input.match?.id,
    input.match?.matchId,
    input.homeTeam?.id,
    input.awayTeam?.id,
    input.homeTeamName,
    input.awayTeamName,
  ]);

  return { videos, loading };
}
