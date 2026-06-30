import type { GroupStanding, MergedMatch } from "../../types";

export function buildStandingsFingerprint(groupStandings: GroupStanding[]): string {
  return groupStandings
    .flatMap((standing) =>
      standing.rows.map(
        (row) =>
          `${standing.group}:${row.teamId}:${row.points}:${row.goalDifference}:${row.played}:${row.wins}:${row.draws}:${row.losses}`
      )
    )
    .sort()
    .join("|");
}

/** Fields that affect schedule materialization / qualification — excludes live clock ticks. */
export function buildScheduleOverlayFingerprint(
  liveMatches: Record<string, MergedMatch>,
  groupStandings: GroupStanding[]
): string {
  const parts: string[] = [];
  for (const [key, match] of Object.entries(liveMatches)) {
    parts.push(
      `${key}:${match.matchId ?? ""}:${match.status}:${match.homeScore ?? ""}:${match.awayScore ?? ""}:${match.locked ? 1 : 0}:${match.date ?? ""}:${match.homeTeamId}:${match.awayTeamId}:${match.group ?? ""}`
    );
  }
  parts.sort();
  return `${parts.join("|")}::${buildStandingsFingerprint(groupStandings)}`;
}
