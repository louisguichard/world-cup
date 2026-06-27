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

    let cancelled = false;
    setLoading(true);

    void resolveYouTubeMatchVideos({
      match: input.match,
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      homeTeamName: input.homeTeamName,
      awayTeamName: input.awayTeamName,
    })
      .then((result) => {
        if (!cancelled) setVideos(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
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

