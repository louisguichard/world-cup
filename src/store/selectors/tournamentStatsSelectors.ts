import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  buildTournamentStatsFingerprint,
  filterGoldenBootRace,
  rebuildTournamentPlayerStatsIndex,
  readTournamentPlayerStatsCache,
  type TournamentPlayerStatsSnapshot,
} from "../../lib/tournamentPlayerStatsIndex";
import {
  getActiveCareerLeaders,
  getAllTimeCareerLeaders,
  type WcCareerLeaderRow,
} from "../../lib/worldCupGoalscorersReference";
import type { MatchEvent, MergedMatch, Team, TournamentPlayerStat } from "../../types";
import { useStore } from "../index";

export type TournamentStatsSlice = {
  liveMatches: Record<string, MergedMatch>;
  matchEvents: Record<string, MatchEvent[]>;
  teams: Record<string, Team>;
};

function snapshotFromState(state: TournamentStatsSlice): TournamentPlayerStatsSnapshot {
  return rebuildTournamentPlayerStatsIndex(
    Object.values(state.liveMatches),
    state.matchEvents,
    state.teams
  );
}

export function selectTournamentPlayerStatsSnapshot(
  state: TournamentStatsSlice
): TournamentPlayerStatsSnapshot {
  return snapshotFromState(state);
}

export function selectTopScorers2026(
  state: TournamentStatsSlice,
  limit?: number
): TournamentPlayerStat[] {
  const scorers = snapshotFromState(state).topScorers;
  return limit != null ? scorers.slice(0, limit) : scorers;
}

export function selectTopAssists2026(
  state: TournamentStatsSlice,
  limit?: number
): TournamentPlayerStat[] {
  const assists = snapshotFromState(state).topAssists;
  return limit != null ? assists.slice(0, limit) : assists;
}

export function selectGoldenBootRace(
  state: TournamentStatsSlice,
  minGoals = 3
): TournamentPlayerStat[] {
  return filterGoldenBootRace(selectTopScorers2026(state), minGoals);
}

export function selectActiveCareerLeaders(
  state: TournamentStatsSlice,
  limit = 10
): WcCareerLeaderRow[] {
  return getActiveCareerLeaders(selectTopScorers2026(state), limit);
}

export function selectAllTimeCareerLeaders(
  state: TournamentStatsSlice,
  limit = 5
): WcCareerLeaderRow[] {
  return getAllTimeCareerLeaders(selectTopScorers2026(state), limit);
}

function useTournamentStatsFingerprint() {
  const liveMatches = useStore(useShallow((s) => s.liveMatches));
  const matchEvents = useStore(useShallow((s) => s.matchEvents));
  return useMemo(
    () => buildTournamentStatsFingerprint(liveMatches, matchEvents),
    [liveMatches, matchEvents]
  );
}

export function useTournamentPlayerStatsSnapshot(): TournamentPlayerStatsSnapshot {
  const liveMatches = useStore(useShallow((s) => s.liveMatches));
  const matchEvents = useStore(useShallow((s) => s.matchEvents));
  const teams = useStore((s) => s.teams);
  const fingerprint = useTournamentStatsFingerprint();

  return useMemo(() => {
    void fingerprint;
    return rebuildTournamentPlayerStatsIndex(Object.values(liveMatches), matchEvents, teams);
  }, [fingerprint, liveMatches, matchEvents, teams]);
}

/** Hydrates from cache on first paint, then live snapshot once events are available. */
export function useTournamentPlayerStatsSnapshotWithCache(): TournamentPlayerStatsSnapshot {
  const live = useTournamentPlayerStatsSnapshot();
  const fingerprint = useTournamentStatsFingerprint();

  return useMemo(() => {
    if (fingerprint.length > 0 && live.topScorers.length > 0) return live;
    return readTournamentPlayerStatsCache() ?? live;
  }, [fingerprint, live]);
}

export function useTopScorers2026(limit?: number): TournamentPlayerStat[] {
  const snapshot = useTournamentPlayerStatsSnapshotWithCache();
  return useMemo(
    () => (limit != null ? snapshot.topScorers.slice(0, limit) : snapshot.topScorers),
    [snapshot, limit]
  );
}

export function useTopAssists2026(limit?: number): TournamentPlayerStat[] {
  const snapshot = useTournamentPlayerStatsSnapshotWithCache();
  return useMemo(
    () => (limit != null ? snapshot.topAssists.slice(0, limit) : snapshot.topAssists),
    [snapshot, limit]
  );
}

export function useGoldenBootRace(minGoals = 3): TournamentPlayerStat[] {
  const snapshot = useTournamentPlayerStatsSnapshotWithCache();
  return useMemo(
    () => filterGoldenBootRace(snapshot.topScorers, minGoals),
    [snapshot.topScorers, minGoals]
  );
}

export function useActiveCareerLeaders(limit = 10): WcCareerLeaderRow[] {
  const topScorers = useTopScorers2026();
  return useMemo(() => getActiveCareerLeaders(topScorers, limit), [topScorers, limit]);
}

export function useAllTimeCareerLeaders(limit = 5): WcCareerLeaderRow[] {
  const topScorers = useTopScorers2026();
  return useMemo(() => getAllTimeCareerLeaders(topScorers, limit), [topScorers, limit]);
}
