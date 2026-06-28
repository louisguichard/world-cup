import { useEffect, useState } from "react";
import type { MatchEvent, MergedMatch, Team } from "../types";
import type { AiMatchHighlightsIntro } from "../types/aiSportsHighlights";
import { readAiHighlightIntro } from "../lib/aiHighlightsStaticCache";
import { fetchAiMatchHighlights } from "../services/highlights/fetchAiMatchHighlights";

const EMPTY: AiMatchHighlightsIntro = {
  matchId: "",
  request: {
    competition: "",
    teamA: "",
    teamB: "",
    score: "",
    keyMoments: "",
    language: "en",
  },
  response: null,
  result: null,
  fetchedAt: "",
  source: "ai-sports-highlights-api",
  attribution: "",
  status: "pending",
};

export function useAiMatchHighlights(
  match: MergedMatch | null,
  homeTeam?: Team,
  awayTeam?: Team,
  events?: MatchEvent[]
): AiMatchHighlightsIntro & { loading: boolean } {
  const [intro, setIntro] = useState<AiMatchHighlightsIntro>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!match) {
      setIntro(EMPTY);
      return;
    }

    const cached = readAiHighlightIntro(match.id);
    if (cached) {
      setIntro(cached);
      return;
    }

    if (match.status !== "completed") {
      setIntro({
        ...EMPTY,
        matchId: match.id,
        status: "pending",
        attribution: "AI recap generates after the final whistle.",
      });
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchAiMatchHighlights({ match, homeTeam, awayTeam, events }).then((result) => {
      if (!cancelled) {
        setIntro(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [match?.id, match?.status, match?.homeScore, match?.awayScore, homeTeam?.id, awayTeam?.id, events]);

  return { ...intro, loading };
}
