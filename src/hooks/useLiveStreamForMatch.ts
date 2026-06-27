import { useEffect, useState } from "react";
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

const EMPTY: LiveStreamMatchBundle = {
  streamMatchId: null,
  scheduleMatch: null,
  play: null,
  fetchedAt: 0,
};

export function useLiveStreamForMatch(
  match: MergedMatch | null,
  homeTeam?: Team,
  awayTeam?: Team
): LiveStreamMatchBundle & { loading: boolean } {
  const teams = useStore((s) => s.teams);
  const [bundle, setBundle] = useState<LiveStreamMatchBundle>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!match) {
      setBundle(EMPTY);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const homeName = teamDisplayNameForMatch(match, "home", teams);
    const awayName = teamDisplayNameForMatch(match, "away", teams);
    const scheduleDate = match.date.slice(0, 10);

    void (async () => {
      const schedule = await fetchLiveStreamSchedule({ currentDate: scheduleDate });
      if (cancelled) return;

      if (schedule.upstreamError && schedule.matches.length === 0) {
        const iptv = await resolveIptvStreamsForMatch(homeName, awayName);
        if (cancelled) return;

        setBundle({
          streamMatchId: null,
          scheduleMatch: null,
          play: iptv.available
            ? {
                available: true,
                servers: iptv.servers,
              }
            : null,
          scheduleError: schedule.upstreamError,
          iptv: {
            available: iptv.available,
            sources: iptv.sources,
            servers: iptv.servers,
            error: iptv.error,
          },
          fetchedAt: Date.now(),
        });
        setLoading(false);
        return;
      }

      const row =
        findLiveStreamScheduleMatch(schedule.matches, homeName, awayName) ??
        schedule.matches.find((m) => m.isLive) ??
        null;

      if (!row) {
        const iptv = await resolveIptvStreamsForMatch(homeName, awayName);
        if (cancelled) return;

        setBundle({
          streamMatchId: null,
          scheduleMatch: null,
          play: iptv.available
            ? {
                available: true,
                servers: iptv.servers,
              }
            : null,
          iptv: {
            available: iptv.available,
            sources: iptv.sources,
            servers: iptv.servers,
            error: iptv.error,
          },
          fetchedAt: Date.now(),
        });
        setLoading(false);
        return;
      }

      const play = await checkLiveStreamAvailability(row.id);
      if (cancelled) return;

      let iptvBundle: LiveStreamMatchBundle["iptv"];
      if (!play?.available) {
        const iptv = await resolveIptvStreamsForMatch(homeName, awayName);
        if (cancelled) return;
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

      setBundle({
        streamMatchId: row.id,
        scheduleMatch: row,
        play: mergedPlay,
        iptv: iptvBundle,
        fetchedAt: Date.now(),
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [match?.id, match?.date, homeTeam?.id, awayTeam?.id]);

  return { ...bundle, loading };
}
