import { useCallback, useEffect, useState } from "react";
import type { FuturesOdds, MatchStatus, OddsSnapshot } from "../types";
import { getOdds } from "../services/OddsCache";
import { getLiveOdds } from "../services/OddsIntelligenceClient";
import { usePollingGov } from "./usePollingGov";

const FUTURES_TTL_MS = 30 * 60 * 1000;
const WARM_POLL_MS = 30_000;

let futuresCache: { data: FuturesOdds | null; fetchedAt: number } = {
  data: null,
  fetchedAt: 0,
};

function shouldFetchOdds(status: MatchStatus | undefined): boolean {
  return status === "live" || status === "scheduled" || status === undefined;
}

/** Fetches live match odds and optional futures with TTL caching. */
export function useLiveOdds(
  matchId: string | null,
  espnEventId: string | null | undefined,
  matchStatus?: MatchStatus,
  homeTeam?: string,
  awayTeam?: string
): {
  odds: OddsSnapshot | null;
  futures: FuturesOdds | null;
  loading: boolean;
} {
  const [odds, setOdds] = useState<OddsSnapshot | null>(null);
  const [futures, setFutures] = useState<FuturesOdds | null>(null);
  const [loading, setLoading] = useState(false);

  const warmEnabled = Boolean(matchId && espnEventId && shouldFetchOdds(matchStatus));

  const fetchMatchOdds = useCallback(
    async (signal?: AbortSignal) => {
      if (!matchId || !espnEventId || !shouldFetchOdds(matchStatus)) return;

      setLoading(true);
      try {
        const eventOdds = await getOdds(
          espnEventId,
          homeTeam && awayTeam ? { home: homeTeam, away: awayTeam } : undefined
        );
        if (signal?.aborted) return;

        if (!eventOdds?.bestHome || !eventOdds.bestDraw || !eventOdds.bestAway) {
          setOdds(null);
          return;
        }

        setOdds({
          matchId,
          homeWin: eventOdds.bestHome,
          draw: eventOdds.bestDraw,
          awayWin: eventOdds.bestAway,
          fetchedAt: Date.now(),
        });
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [matchId, espnEventId, matchStatus, homeTeam, awayTeam]
  );

  useEffect(() => {
    if (!warmEnabled) {
      setOdds(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    void fetchMatchOdds(ac.signal);
    return () => ac.abort();
  }, [warmEnabled, fetchMatchOdds]);

  usePollingGov(() => {
    void fetchMatchOdds();
  }, WARM_POLL_MS, warmEnabled);

  useEffect(() => {
    const ac = new AbortController();
    const stale = Date.now() - futuresCache.fetchedAt > FUTURES_TTL_MS;
    if (!stale && futuresCache.data) {
      setFutures(futuresCache.data);
      return () => ac.abort();
    }

    void getLiveOdds().then((lines) => {
      if (ac.signal.aborted) return;
      const mapped: FuturesOdds = {
        teams: lines.map((l) => ({
          teamId: l.eventId,
          name: l.homeTeam,
          odds: l.bestHome ?? 0,
        })),
        fetchedAt: Date.now(),
      };
      futuresCache = { data: mapped, fetchedAt: Date.now() };
      setFutures(mapped);
    });

    return () => ac.abort();
  }, []);

  return { odds, futures, loading };
}
