/** Live group tables — replay partial scores so standings update as goals go in. */
import type { GroupLetter, GroupStanding, MergedMatch, Team } from "../types";
import { matchCountsForStandings } from "./qualification";
import { replayStandings, type ReplayMatch } from "./replayStandings";

export function buildLiveGroupReplayMatches(
  matches: MergedMatch[],
  group: GroupLetter
): ReplayMatch[] {
  const replays: ReplayMatch[] = [];

  for (const match of matches) {
    if (match.group !== group) continue;
    if (!matchCountsForStandings(match)) continue;

    const isCompleted = Boolean(match.locked || match.status === "completed");

    replays.push({
      matchId: match.id,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      group,
      homeScore: match.homeScore!,
      awayScore: match.awayScore!,
      isCompleted,
    });
  }

  return replays;
}

export function computeLiveGroupStanding(
  group: GroupLetter,
  matches: MergedMatch[],
  teams: Team[]
): GroupStanding | null {
  if (teams.length === 0) return null;

  const replays = buildLiveGroupReplayMatches(matches, group);
  const standings = replayStandings(replays, teams);
  return standings.find((standing) => standing.group === group) ?? null;
}

/** Team ids currently playing live in this group. */
export function liveTeamIdsInGroup(
  matches: MergedMatch[],
  group: GroupLetter
): Set<string> {
  const ids = new Set<string>();
  for (const match of matches) {
    if (match.group !== group || match.status !== "live") continue;
    ids.add(match.homeTeamId);
    ids.add(match.awayTeamId);
  }
  return ids;
}

/** Groups that have at least one live match right now. */
export function liveGroupsFromMatches(matches: MergedMatch[]): GroupLetter[] {
  const groups = new Set<GroupLetter>();
  for (const match of matches) {
    if (match.group && match.status === "live") {
      groups.add(match.group);
    }
  }
  return [...groups].sort();
}
