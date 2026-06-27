import { useEffect, useState } from "react";
import type { LiveStreamScheduleMatch } from "../types/liveStream";
import { fetchLiveStreamSchedule } from "../services/AllSportLiveStreamClient";

export function useLiveFootballStreamSchedule(): {
  matches: LiveStreamScheduleMatch[];
  loading: boolean;
  error?: string;
} {
  const [matches, setMatches] = useState<LiveStreamScheduleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    void fetchLiveStreamSchedule().then((result) => {
      if (cancelled) return;
      setMatches(result.matches);
      setError(result.upstreamError);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { matches, loading, error };
}
