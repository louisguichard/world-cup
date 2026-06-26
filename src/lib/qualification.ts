import type { GroupStanding, Match, MatchWithScore, QualificationStatus, QualificationTier, ScoreOverride, Team, TeamRecord } from "../types";
import { rankBestThirds } from "./bestThirds";
import { computeStandings } from "./tournament";

const GROUP_MATCHES_PER_TEAM = 3;

export function deriveStandings(
  matches: MatchWithScore[],
  teams: Team[],
  _overrides: Record<string, ScoreOverride> = {}
): GroupStanding[] {
  return computeStandings(matches, teams);
}

/** Returns standings only when scored group-stage matches exist; otherwise null (caller should preserve existing). */
export function deriveStandingsIfScored(matches: Match[], teams: Team[]): GroupStanding[] | null {
  const scored = matches.filter(
    (m): m is MatchWithScore =>
      Boolean(m.group) && m.homeScore !== undefined && m.awayScore !== undefined
  );
  if (scored.length === 0) return null;
  return deriveStandings(scored, teams);
}

export function maxPoints(record: TeamRecord): number {
  const remaining = Math.max(0, GROUP_MATCHES_PER_TEAM - record.played);
  return record.points + remaining * 3;
}

/** True when a team cannot fall out of the top two even if they lose every remaining match. */
export function isConfirmedTopTwo(row: TeamRecord, rows: TeamRecord[]): boolean {
  if (row.played >= GROUP_MATCHES_PER_TEAM) {
    return rows.findIndex((r) => r.teamId === row.teamId) < 2;
  }
  const teamsThatCanPass = rows.filter(
    (other) => other.teamId !== row.teamId && maxPoints(other) > row.points
  ).length;
  return teamsThatCanPass < 2;
}

export function computeEliminationProbability(pointsGap: number, matchesRemaining: number): number {
  const x = -0.35 * pointsGap - 0.15 * matchesRemaining;
  return 1 / (1 + Math.exp(-x));
}

export function computeQualificationStatus(teamId: string, standings: GroupStanding[]): QualificationStatus {
  for (const group of standings) {
    const idx = group.rows.findIndex((r) => r.teamId === teamId);
    if (idx < 0) continue;

    const rank = idx + 1;
    const row = group.rows[idx]!;
    const second = group.rows[1];
    const third = group.rows[2];
    const remaining = Math.max(0, GROUP_MATCHES_PER_TEAM - row.played);
    const teamMax = maxPoints(row);

    if (rank <= 2) {
      const confirmed = isConfirmedTopTwo(row, group.rows);
      return {
        status: "qualified",
        certainty: confirmed ? "confirmed" : "projected",
        reason: confirmed
          ? "Mathematically locked into the top two — will advance regardless of remaining results."
          : "Currently in the top two, but other teams can still overtake them."
      };
    }

    if (rank === 3) {
      const gapToSecond = (second?.points ?? 0) - row.points;
      const prob = computeEliminationProbability(gapToSecond, remaining);

      if (second && teamMax < second.points) {
        return {
          status: "projected_out",
          certainty: "confirmed",
          eliminationProbability: 1,
          reason: "Cannot reach the top two even with maximum points."
        };
      }

      const bestThirds = rankBestThirds(standings);
      const thirdRankAmongThirds = bestThirds.findIndex((r) => r.teamId === teamId);
      const inBestEightThirds = thirdRankAmongThirds >= 0 && thirdRankAmongThirds < 8;

      if (remaining === 0) {
        return {
          status: inBestEightThirds ? "at_risk" : "eliminated",
          certainty: "confirmed",
          eliminationProbability: inBestEightThirds ? prob : 1,
          reason: inBestEightThirds
            ? "Confirmed among the best eight third-placed teams."
            : "Finished third but did not rank among the best eight third-placed teams."
        };
      }

      if (prob < 0.35) {
        return {
          status: "at_risk",
          certainty: "projected",
          eliminationProbability: prob,
          pointsNeeded: gapToSecond,
          reason: "Third place — projected among the best eight third-placed teams, but not guaranteed."
        };
      }

      return {
        status: "projected_out",
        certainty: "projected",
        eliminationProbability: prob,
        reason: "Third place — must improve points or goal difference to reach the best-eight third-placed cut."
      };
    }

    if (rank === 4) {
      if (remaining === 0) {
        return {
          status: "eliminated",
          certainty: "confirmed",
          reason: "Finished fourth in the group — eliminated."
        };
      }

      if (third && teamMax < third.points) {
        return {
          status: "eliminated",
          certainty: "confirmed",
          reason: "Cannot reach third place even with maximum points — no knockout path remains."
        };
      }

      if (second && teamMax < second.points) {
        return {
          status: "eliminated",
          certainty: "confirmed",
          reason: "Cannot reach the top two even with maximum points."
        };
      }

      return {
        status: "projected_out",
        certainty: "projected",
        reason: "Fourth place — must win out and need other results to climb the table."
      };
    }

    const leaderPoints = group.rows[0]?.points ?? 0;
    const gap = leaderPoints - row.points;
    if (gap > remaining * 3) {
      return {
        status: "eliminated",
        certainty: "confirmed",
        reason: "Cannot catch the group leaders."
      };
    }

    return {
      status: "pending",
      certainty: "projected",
      reason: "Still fighting for position — outcome depends on remaining matches."
    };
  }

  return {
    status: "pending",
    certainty: "projected",
    reason: "Group standings not available yet."
  };
}

export type QualificationBuckets = {
  confirmedThrough: string[];
  projectedThrough: string[];
  confirmedOut: string[];
  projectedOut: string[];
  inContention: string[];
};

export function bucketQualificationTeams(
  teamIds: string[],
  standings: GroupStanding[]
): QualificationBuckets {
  const buckets: QualificationBuckets = {
    confirmedThrough: [],
    projectedThrough: [],
    confirmedOut: [],
    projectedOut: [],
    inContention: []
  };

  for (const teamId of teamIds) {
    const q = computeQualificationStatus(teamId, standings);
    switch (q.status) {
      case "qualified":
        if (q.certainty === "confirmed") buckets.confirmedThrough.push(teamId);
        else buckets.projectedThrough.push(teamId);
        break;
      case "eliminated":
        if (q.certainty === "confirmed") buckets.confirmedOut.push(teamId);
        else buckets.projectedOut.push(teamId);
        break;
      case "at_risk":
      case "pending":
        buckets.inContention.push(teamId);
        break;
      case "projected_out":
        buckets.projectedOut.push(teamId);
        break;
      default: {
        const _exhaustive: never = q.status;
        return _exhaustive;
      }
    }
  }

  return buckets;
}

export function useQualificationTierFromStatus(status: QualificationStatus): QualificationTier {
  return status.status;
}

export function groupStageComplete(matches: Array<{ group?: string; status: string }>): boolean {
  const groupMatches = matches.filter((m) => m.group);
  const completed = groupMatches.filter((m) => m.status === "completed");
  return completed.length >= 72;
}

export function standingsEqual(a: GroupStanding[], b: GroupStanding[]): boolean {
  if (a.length !== b.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
