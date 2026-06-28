import { useEffect, useMemo, useState } from "react";
import type { Lineup, MatchStatisticsBundle, MergedMatch } from "../types";
import type { WcCommentaryEntry } from "../services/WorldCup2026LiveClient";
import { useMatchEnrichment } from "./useMatchEnrichment";
import { DataOrchestrator } from "../services/orchestrator/DataOrchestrator";
import { fetchMatchBundle } from "../services/matchDetail/fetchMatchBundle";
import { mapEventsToCommentary } from "../services/matchDetail/mapEventsToCommentary";
import { publishMatchEvents } from "../services/matchDetail/fetchMatchEvents";
import { teamDisplayNameFromId, teamDisplayNameForMatch } from "../lib/matchTeamDisplay";
import { useStore } from "../store";

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
  fetchedAt: null,
};

function resolveStoredEvents(
  match: MergedMatch,
  matchEvents: Record<string, import("../types").MatchEvent[]>
): import("../types").MatchEvent[] {
  const keys = [match.id, match.matchId, match.espnEventId].filter(Boolean) as string[];
  for (const key of keys) {
    const events = matchEvents[key];
    if (events?.length) return events;
  }
  return [];
}

/** Match detail bundle — orchestrator enrichment + multi-source fetch cascade. */
export function useMatchDetailBundle(
  match: MergedMatch | null,
  wcMatchId: string | null
): BundleState & { refetch: () => void } {
  const matchId = match?.id ?? null;
  const enrichment = useMatchEnrichment(matchId);
  const matchEvents = useStore((s) => s.matchEvents);
  const [direct, setDirect] = useState<Pick<BundleState, "statistics" | "lineups" | "commentary">>({
    statistics: null,
    lineups: [],
    commentary: [],
  });
  const [directLoading, setDirectLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [forceKey, setForceKey] = useState(0);

  useEffect(() => {
    if (enrichment.enrichment) {
      setFetchedAt(Date.now());
    }
  }, [enrichment.enrichment]);

  const teams = useStore((s) => s.teams);

  useEffect(() => {
    if (!match) return;

    const homeName = teamDisplayNameFromId(match.homeTeamId, teams);
    const awayName = teamDisplayNameFromId(match.awayTeamId, teams);

    let cancelled = false;
    setDirectLoading(true);

    void fetchMatchBundle(match, wcMatchId, forceKey > 0, { homeName, awayName, teams }).then(
      (bundle) => {
        if (cancelled) return;
        setDirect({
          statistics: bundle.statistics,
          lineups: bundle.lineups,
          commentary: bundle.commentary,
        });
        setFetchedAt(bundle.fetchedAt);
        setDirectLoading(false);
        if (bundle.events.length > 0) publishMatchEvents(match, bundle.events);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [match, wcMatchId, forceKey, teams]);

  const refetch = () => {
    if (match) {
      DataOrchestrator.getInstance().clearEnrichmentCache(match.id);
      void DataOrchestrator.getInstance().enrichMatch(match.id);
    }
    setForceKey((k) => k + 1);
  };

  const storedEvents = useMemo(
    () => (match ? resolveStoredEvents(match, matchEvents) : []),
    [match, matchEvents]
  );

  const statistics = enrichment.statistics ?? direct.statistics;
  const lineups = enrichment.lineups.length > 0 ? enrichment.lineups : direct.lineups;

  const enrichmentCommentary: WcCommentaryEntry[] =
    enrichment.commentary.length > 0
      ? enrichment.commentary.map((e) => ({
          minute: e.minute,
          text: e.text,
          type: e.type,
        }))
      : [];

  const commentary: WcCommentaryEntry[] =
    enrichmentCommentary.length > 0
      ? enrichmentCommentary
      : direct.commentary.length > 0
        ? direct.commentary
        : mapEventsToCommentary(storedEvents);

  return {
    statistics,
    lineups,
    commentary,
    loading: enrichment.loading || directLoading,
    error: enrichment.error,
    fetchedAt,
    refetch,
  };
}
