import { useCallback, useEffect, useState } from "react";
import type { MergedMatch, Team } from "../types";
import type { LiveStreamMatchBundle } from "../types/liveStream";
import { teamDisplayNameForMatch } from "../lib/matchTeamDisplay";
import { useStore } from "../store";
import {
  checkLiveStreamAvailability,
  fetchLiveStreamSchedule,
  findLiveStreamScheduleMatch,
} from "../services/AllSportLiveStreamClient";
import { resolveIptvStreamsForMatch } from "../services/IptvStreamClient";
import { usePollingGov } from "./usePollingGov";

const WARM_POLL_MS = 30_000;

const EMPTY: LiveStreamMatchBundle = {
  streamMatchId: null,
  scheduleMatch: null,
  play: null,
  fetchedAt: 0,
};

async function loadLiveStreamBundle(
  match: MergedMatch,
  teams: Record<string, Team>,
  homeTeam?: Team,
  awayTeam?: Team,
  signal?: AbortSignal
): Promise<LiveStreamMatchBundle> {
  const homeName = teamDisplayNameForMatch(match, "home", teams);
  const awayName = teamDisplayNameForMatch(match, "away", teams);
  const scheduleDate = match.date.slice(0, 10);

  const schedule = await fetchLiveStreamSchedule({ currentDate: scheduleDate });
  if (signal?.aborted) return EMPTY;

  if (schedule.upstreamError && schedule.matches.length === 0) {
    const iptv = await resolveIptvStreamsForMatch(homeName, awayName);
    if (signal?.aborted) return EMPTY;

    return {
      streamMatchId: null,
      scheduleMatch: null,
      play: iptv.available ? { available: true, servers: iptv.servers } : null,
      scheduleError: schedule.upstreamError,
      iptv: {
        available: iptv.available,
        sources: iptv.sources,
        servers: iptv.servers,
        error: iptv.error,
      },
      fetchedAt: Date.now(),
    };
  }

  const row =
    findLiveStreamScheduleMatch(schedule.matches, homeName, awayName) ??
    schedule.matches.find((m) => m.isLive) ??
    null;

  if (!row) {
    const iptv = await resolveIptvStreamsForMatch(homeName, awayName);
    if (signal?.aborted) return EMPTY;

    return {
      streamMatchId: null,
      scheduleMatch: null,
      play: iptv.available ? { available: true, servers: iptv.servers } : null,
      iptv: {
        available: iptv.available,
        sources: iptv.sources,
        servers: iptv.servers,
        error: iptv.error,
      },
      fetchedAt: Date.now(),
    };
  }

  const play = await checkLiveStreamAvailability(row.id);
  if (signal?.aborted) return EMPTY;

  let iptvBundle: LiveStreamMatchBundle["iptv"];
  if (!play?.available) {
    const iptv = await resolveIptvStreamsForMatch(homeName, awayName);
    if (signal?.aborted) return EMPTY;
    iptvBundle = {
      available: iptv.available,
      sources: iptv.sources,
      servers: iptv.servers,
      error: iptv.error,
    };
  }

  const mergedPlay =
    play?.available
      ? play
      : iptvBundle?.available
        ? { available: true, servers: iptvBundle.servers }
        : play;

  return {
    streamMatchId: row.id,
    scheduleMatch: row,
    play: mergedPlay,
    iptv: iptvBundle,
    fetchedAt: Date.now(),
  };
}

export function useLiveStreamForMatch(
  match: MergedMatch | null,
  homeTeam?: Team,
  awayTeam?: Team
): LiveStreamMatchBundle & { loading: boolean } {
  const teams = useStore((s) => s.teams);
  const [bundle, setBundle] = useState<LiveStreamMatchBundle>(EMPTY);
  const [loading, setLoading] = useState(false);

  const warmEnabled = match?.status === "live";

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!match) return;
      setLoading(true);
      try {
        const next = await loadLiveStreamBundle(match, teams, homeTeam, awayTeam, signal);
        if (!signal?.aborted) setBundle(next);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [match, teams, homeTeam, awayTeam]
  );

  useEffect(() => {
    if (!match) {
      setBundle(EMPTY);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [match?.id, match?.date, match?.status, homeTeam?.id, awayTeam?.id, load]);

  usePollingGov(() => {
    void load();
  }, WARM_POLL_MS, warmEnabled);

  return { ...bundle, loading };
}
