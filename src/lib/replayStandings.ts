/** Re-computes group standings from partial match scores for timeline replay. */
import type { GroupLetter, GroupStanding, MatchWithScore, Team } from "../types";
import { matchCountsForStandings } from "./qualification";
import { computeStandings } from "./tournament";

/** A match frozen at a specific moment in the timeline. */
export type ReplayMatch = {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  group: GroupLetter;
  homeScore: number;
  awayScore: number;
  isCompleted: boolean;
};

function toScoredMatch(replay: ReplayMatch): MatchWithScore | null {
  const match: MatchWithScore = {
    id: replay.matchId,
    group: replay.group,
    date: "",
    homeTeamId: replay.homeTeamId,
    awayTeamId: replay.awayTeamId,
    homeScore: replay.homeScore,
    awayScore: replay.awayScore,
    status: replay.isCompleted ? "completed" : "live",
    homeConduct: 0,
    awayConduct: 0,
    locked: replay.isCompleted,
    source: "model",
  };

  return matchCountsForStandings(match) ? match : null;
}

/**
 * Given partial match scores, re-compute group standings as if only those
 * results had occurred.
 */
export function replayStandings(partialMatches: ReplayMatch[], teams: Team[]): GroupStanding[] {
  if (teams.length === 0) return [];

  const scored = partialMatches
    .map(toScoredMatch)
    .filter((match): match is MatchWithScore => match !== null);

  if (scored.length === 0) {
    return computeStandings([], teams);
  }

  return computeStandings(scored, teams);
}
