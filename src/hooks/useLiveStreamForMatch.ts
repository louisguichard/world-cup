import { useEffect, useState } from "react";
import type { MergedMatch, Team } from "../types";
import type { LiveStreamMatchBundle } from "../types/liveStream";
import { teamDisplayName } from "../lib/teamIdentity";
import {
  checkLiveStreamAvailability,
  fetchLiveStreamSchedule,
  findLiveStreamScheduleMatch,
} from "../services/AllSportLiveStreamClient";

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
  const [bundle, setBundle] = useState<LiveStreamMatchBundle>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!match) {
      setBundle(EMPTY);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const homeName = teamDisplayName(homeTeam, match.homeTeamId);
    const awayName = teamDisplayName(awayTeam, match.awayTeamId);
    const scheduleDate = match.date.slice(0, 10);

    void (async () => {
      const schedule = await fetchLiveStreamSchedule({ currentDate: scheduleDate });
      if (cancelled) return;

      if (schedule.upstreamError && schedule.matches.length === 0) {
        setBundle({
          streamMatchId: null,
          scheduleMatch: null,
          play: null,
          scheduleError: schedule.upstreamError,
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
        setBundle({
          streamMatchId: null,
          scheduleMatch: null,
          play: null,
          fetchedAt: Date.now(),
        });
        setLoading(false);
        return;
      }

      const play = await checkLiveStreamAvailability(row.id);
      if (cancelled) return;

      setBundle({
        streamMatchId: row.id,
        scheduleMatch: row,
        play,
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
