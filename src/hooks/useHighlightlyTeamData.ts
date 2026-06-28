import { useEffect, useState } from "react";
import {
  fetchHighlightlyHighlights,
  fetchHighlightlyLastFiveGames,
  fetchHighlightlyTeamStatistics,
  resolveHighlightlyTeamId,
} from "../services/SportHighlightsClient";
import type { HighlightlyHighlight, HighlightlyMatch, HighlightlyTeamSeasonStats } from "../types/sportHighlights";

export type HighlightlyTeamBundle = {
  teamId: number | null;
  highlights: HighlightlyHighlight[];
  lastFive: HighlightlyMatch[];
  seasonStats: HighlightlyTeamSeasonStats[];
  loading: boolean;
};

/** Cold tier — team highlight bundle once when enabled. */
export function useHighlightlyTeamData(teamName: string, enabled: boolean): HighlightlyTeamBundle {
  const [teamId, setTeamId] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<HighlightlyHighlight[]>([]);
  const [lastFive, setLastFive] = useState<HighlightlyMatch[]>([]);
  const [seasonStats, setSeasonStats] = useState<HighlightlyTeamSeasonStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !teamName.trim()) {
      setTeamId(null);
      setHighlights([]);
      setLastFive([]);
      setSeasonStats([]);
      return;
    }

    const ac = new AbortController();
    setLoading(true);

    void (async () => {
      const id = await resolveHighlightlyTeamId(teamName);
      if (ac.signal.aborted) return;
      setTeamId(id);

      if (!id) {
        setHighlights([]);
        setLastFive([]);
        setSeasonStats([]);
        setLoading(false);
        return;
      }

      const fromDate = "2026-01-01";
      const [hl, form, stats] = await Promise.all([
        fetchHighlightlyHighlights({ homeTeamName: teamName, limit: 12 }),
        fetchHighlightlyLastFiveGames(id),
        fetchHighlightlyTeamStatistics(id, fromDate),
      ]);

      if (ac.signal.aborted) return;
      setHighlights(hl);
      setLastFive(form);
      setSeasonStats(stats);
      setLoading(false);
    })();

    return () => ac.abort();
  }, [teamName, enabled]);

  return { teamId, highlights, lastFive, seasonStats, loading };
}
