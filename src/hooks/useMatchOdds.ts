import { useCallback, useEffect, useMemo, useState } from "react";
import type { MergedMatch, MatchStatus, OddsSnapshot } from "../types";
import { snapshotFromProbabilities } from "../lib/oddsFormat";
import { resolvePolymarketOdds } from "../lib/polymarketMatchOdds";
import { getOdds } from "../services/OddsCache";
import { fetchSportsLiveScoresOdds } from "../services/SportsLiveScoresClient";
import { normalizeSLSOdds } from "../lib/normalizeSLSOdds";
import { isApiEnabled } from "../config/apiFlags";
import { FEATURE_FLAGS } from "../config/featureFlags";
import { useStore } from "../store";
import { usePollingGov } from "./usePollingGov";

const WARM_POLL_MS = 30_000;

function shouldFetchSportsbookOdds(status: MatchStatus | undefined): boolean {
  return status === "live" || status === "scheduled" || status === undefined;
}

/**
 * Match odds with Polymarket first (always available after boot enrichment),
 * then Sports Odds Intelligence RapidAPI as fallback.
 */
export function useMatchOdds(
  match: MergedMatch | null,
  homeTeamName: string,
  awayTeamName: string
): { odds: OddsSnapshot | null; loading: boolean } {
  const teams = useStore((s) => s.teams);
  const knockoutMarkets = useStore((s) => s.knockoutMarkets);
  const [sportsbook, setSportsbook] = useState<OddsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const polymarket = useMemo(() => {
    if (!match) return null;
    const lookup = resolvePolymarketOdds(match, teams, knockoutMarkets);
    if (!lookup) return null;
    const snapshot = snapshotFromProbabilities(
      match.id,
      lookup.probabilities,
      "polymarket",
      lookup.marketSlug
    );
    return { ...snapshot, twoWay: lookup.twoWay };
  }, [match, teams, knockoutMarkets]);

  const fetchSportsbook = useCallback(
    async (signal?: AbortSignal) => {
      if (!match || polymarket) return;
      if (!isApiEnabled("oddsIntelligence") || !shouldFetchSportsbookOdds(match.status)) return;

      const lookupKey = match.espnEventId ?? match.id;
      setLoading(true);

      try {
        const eventOdds = await getOdds(lookupKey, { home: homeTeamName, away: awayTeamName });
        if (signal?.aborted) return;

        if (eventOdds?.bestHome && eventOdds.bestDraw && eventOdds.bestAway) {
          setSportsbook({
            matchId: match.id,
            homeWin: eventOdds.bestHome,
            draw: eventOdds.bestDraw,
            awayWin: eventOdds.bestAway,
            fetchedAt: Date.now(),
            source: "sportsbook",
          });
          return;
        }

        if (FEATURE_FLAGS.sls_odds_enabled && isApiEnabled("sportsLiveScores")) {
          const slsId = match.sofaEventId ?? match.espnEventId ?? match.id;
          const slsRaw = await fetchSportsLiveScoresOdds(slsId);
          if (signal?.aborted) return;
          const normalized = slsRaw ? normalizeSLSOdds(match.id, slsRaw) : null;
          setSportsbook(normalized);
          return;
        }

        setSportsbook(null);
      } catch {
        if (!signal?.aborted) setSportsbook(null);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [match, polymarket, homeTeamName, awayTeamName]
  );

  const warmEnabled =
    Boolean(match) &&
    !polymarket &&
    isApiEnabled("oddsIntelligence") &&
    shouldFetchSportsbookOdds(match?.status);

  useEffect(() => {
    if (!warmEnabled) {
      setSportsbook(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    void fetchSportsbook(ac.signal);
    return () => ac.abort();
  }, [warmEnabled, fetchSportsbook]);

  usePollingGov(() => {
    void fetchSportsbook();
  }, WARM_POLL_MS, warmEnabled);

  return {
    odds: polymarket ?? sportsbook,
    loading: !polymarket && loading,
  };
}
