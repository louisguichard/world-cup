import { useEffect, useState } from "react";
import type { FuturesOdds, MatchStatus, OddsSnapshot } from "../types";
import { getOdds } from "../services/OddsCache";
import { getLiveOdds } from "../services/OddsIntelligenceClient";

const FUTURES_TTL_MS = 30 * 60 * 1000;

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
  matchStatus?: MatchStatus
): {
  odds: OddsSnapshot | null;
  futures: FuturesOdds | null;
  loading: boolean;
} {
  const [odds, setOdds] = useState<OddsSnapshot | null>(null);
  const [futures, setFutures] = useState<FuturesOdds | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!matchId || !espnEventId || !shouldFetchOdds(matchStatus)) {
      setOdds(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void getOdds(espnEventId).then((eventOdds) => {
      if (cancelled) return;
      setLoading(false);
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
    });

    return () => {
      cancelled = true;
    };
  }, [matchId, espnEventId, matchStatus]);

  useEffect(() => {
    const stale = Date.now() - futuresCache.fetchedAt > FUTURES_TTL_MS;
    if (!stale && futuresCache.data) {
      setFutures(futuresCache.data);
      return;
    }

    let cancelled = false;
    void getLiveOdds().then((lines) => {
      if (cancelled) return;
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

    return () => {
      cancelled = true;
    };
  }, []);

  return { odds, futures, loading };
}
