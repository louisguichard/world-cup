import type {
  GroupLetter,
  GroupStanding,
  Match,
  MatchWithScore,
  QualificationCertainty,
  QualificationStatus,
  QualificationTier,
  ScoreOverride,
  Team,
  TeamRecord
} from "../types";
import { rankBestThirds } from "./bestThirds";
import { computeStandings } from "./tournament";

const GROUP_MATCHES_PER_TEAM = 3;
const DEFAULT_GROUP_SIZE = 4;

export function expectedMatchesPerTeam(groupSize: number): number {
  return Math.max(1, groupSize - 1);
}

export function matchesInGroup(groupSize: number): number {
  return (groupSize * (groupSize - 1)) / 2;
}

export type QualificationMatchContext = {
  lockedGroupMatchCount: Partial<Record<GroupLetter, number>>;
  lockedStandingsByGroup: Partial<Record<GroupLetter, TeamRecord[]>>;
};

export function buildQualificationContext(matches: Match[], teams: Team[] = []): QualificationMatchContext {
  const lockedGroupMatchCount: Partial<Record<GroupLetter, number>> = {};
  for (const match of matches) {
    if (match.group && match.locked) {
      lockedGroupMatchCount[match.group] = (lockedGroupMatchCount[match.group] ?? 0) + 1;
    }
  }

  const lockedStandingsByGroup: Partial<Record<GroupLetter, TeamRecord[]>> = {};
  if (teams.length > 0) {
    const lockedScored = matches.filter(
      (m): m is MatchWithScore =>
        Boolean(m.group) &&
        m.locked &&
        m.homeScore !== undefined &&
        m.awayScore !== undefined
    );
    const lockedStandings = computeStandings(lockedScored, teams);
    for (const standing of lockedStandings) {
      if (standing.rows.length > 0) {
        lockedStandingsByGroup[standing.group] = standing.rows;
      }
    }
  }

  return { lockedGroupMatchCount, lockedStandingsByGroup };
}

export type ConfirmedTopTwoOptions = {
  lockedGroupMatchCount?: number;
  groupSize?: number;
  lockedRows?: TeamRecord[];
};

export function deriveStandings(
  matches: MatchWithScore[],
  teams: Team[],
  _overrides: Record<string, ScoreOverride> = {}
): GroupStanding[] {
  return computeStandings(matches, teams);
}

export type DeriveStandingsOptions = {
  lockedOnly?: boolean;
};

export function deriveStandingsIfScored(
  matches: Match[],
  teams: Team[],
  opts: DeriveStandingsOptions = {}
): GroupStanding[] | null {
  const scored = matches.filter(
    (m): m is MatchWithScore =>
      Boolean(m.group) &&
      m.homeScore !== undefined &&
      m.awayScore !== undefined &&
      (!opts.lockedOnly || m.locked)
  );
  if (scored.length === 0) return null;
  return deriveStandings(scored, teams);
}

export function maxPoints(record: TeamRecord, expectedPlayed = GROUP_MATCHES_PER_TEAM): number {
  const remaining = Math.max(0, expectedPlayed - record.played);
  return record.points + remaining * 3;
}

/**
 * A team is CONFIRMED top-two only when:
 * 1. They have played all group stage matches
 * 2. Every other team in their group has also played all matches
 *    (group stage fully complete — no results can change the table)
 * 3. Their final rank in the sorted standings is 1st or 2nd
 *
 * If any team in the group has remaining matches, no team
 * in that group can be confirmed — only projected.
 */
export function isConfirmedTopTwo(
  row: TeamRecord,
  rows: TeamRecord[],
  opts: ConfirmedTopTwoOptions = {}
): boolean {
  const groupSize = opts.groupSize ?? (rows.length || DEFAULT_GROUP_SIZE);
  const expectedPlayed = expectedMatchesPerTeam(groupSize);
  const requiredLockedMatches = matchesInGroup(groupSize);

  const confirmRows = opts.lockedRows !== undefined ? opts.lockedRows : rows;
  if (confirmRows.length === 0) return false;
  const confirmRow = confirmRows.find((r) => r.teamId === row.teamId);
  if (!confirmRow || confirmRow.played < expectedPlayed) return false;

  const groupComplete = confirmRows.length > 0 && confirmRows.every((r) => r.played >= expectedPlayed);
  if (!groupComplete) return false;

  if (
    opts.lockedRows !== undefined
      ? (opts.lockedGroupMatchCount ?? 0) < requiredLockedMatches
      : opts.lockedGroupMatchCount !== undefined &&
        opts.lockedGroupMatchCount < requiredLockedMatches
  ) {
    return false;
  }

  const finalRank = confirmRows.findIndex((r) => r.teamId === row.teamId);
  return finalRank >= 0 && finalRank < 2;
}

function projectedCertaintyTier(
  row: TeamRecord,
  rows: TeamRecord[],
  expectedPlayed: number
): QualificationCertainty {
  const remaining = Math.max(0, expectedPlayed - row.played);
  const third = rows[2];
  const gapToThird = row.points - (third?.points ?? 0);
  if (remaining <= 1 && gapToThird > 4) return "projected_strong";
  return "projected_weak";
}

export function computeEliminationProbability(pointsGap: number, matchesRemaining: number): number {
  const x = -0.35 * pointsGap - 0.15 * matchesRemaining;
  return 1 / (1 + Math.exp(-x));
}

export function computeQualificationStatus(
  teamId: string,
  standings: GroupStanding[],
  context: QualificationMatchContext = { lockedGroupMatchCount: {}, lockedStandingsByGroup: {} }
): QualificationStatus {
  for (const group of standings) {
    const idx = group.rows.findIndex((r) => r.teamId === teamId);
    if (idx < 0) continue;

    const rank = idx + 1;
    const row = group.rows[idx]!;
    const rows = group.rows;
    const lockedRows = context.lockedStandingsByGroup[group.group];
    const useLockedProgress = lockedRows !== undefined;
    const progressRows = useLockedProgress ? lockedRows : rows;
    const progressRow = progressRows.find((r) => r.teamId === teamId) ?? row;
    const groupSize = rows.length || DEFAULT_GROUP_SIZE;
    const expectedPlayed = expectedMatchesPerTeam(groupSize);
    const groupComplete =
      progressRows.length > 0 && progressRows.every((r) => r.played >= expectedPlayed);
    const second = group.rows[1];
    const third = group.rows[2];
    const remaining = Math.max(0, expectedPlayed - progressRow.played);
    const teamMax = maxPoints(progressRow, expectedPlayed);
    const confirmOpts: ConfirmedTopTwoOptions = {
      groupSize,
      lockedGroupMatchCount: context.lockedGroupMatchCount[group.group],
      lockedRows
    };

    if (rank <= 2) {
      const confirmed = isConfirmedTopTwo(row, rows, confirmOpts);
      return {
        status: "qualified",
        certainty: confirmed ? "confirmed" : projectedCertaintyTier(row, rows, expectedPlayed),
        reason: confirmed
          ? "Mathematically locked into the top two — will advance regardless of remaining results."
          : "Currently in the top two, but other teams can still overtake them."
      };
    }

    if (rank === 3) {
      const gapToSecond = (second?.points ?? 0) - row.points;
      const prob = computeEliminationProbability(gapToSecond, remaining);
      const bestThirds = rankBestThirds(standings);
      const thirdRankAmongThirds = bestThirds.findIndex((r) => r.teamId === teamId);
      const inBestEightThirds = thirdRankAmongThirds >= 0 && thirdRankAmongThirds < 8;

      if (remaining === 0 && groupComplete) {
        return {
          status: inBestEightThirds ? "at_risk" : "eliminated",
          certainty: "confirmed",
          eliminationProbability: inBestEightThirds ? prob : 1,
          reason: inBestEightThirds
            ? "Confirmed third — awaiting best-third cut after all groups finish."
            : "Finished third — did not rank among the best eight third-placed teams."
        };
      }

      if (second && teamMax < second.points) {
        return {
          status: "projected_out",
          certainty: "confirmed",
          eliminationProbability: 1,
          reason: "Cannot reach the top two even with maximum points."
        };
      }

      if (prob < 0.35) {
        return {
          status: "at_risk",
          certainty: "projected_weak",
          eliminationProbability: prob,
          pointsNeeded: gapToSecond,
          reason: "Third place — projected among the best eight third-placed teams, but not guaranteed."
        };
      }

      return {
        status: "projected_out",
        certainty: "projected_weak",
        eliminationProbability: prob,
        reason: "Third place — must improve points or goal difference to reach the best-eight third-placed cut."
      };
    }

    if (rank === 4) {
      if (remaining === 0 && groupComplete) {
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
        certainty: "projected_weak",
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
      certainty: "projected_weak",
      reason: "Still fighting for position — outcome depends on remaining matches."
    };
  }

  return {
    status: "pending",
    certainty: "projected_weak",
    reason: "Group standings not available yet."
  };
}

export type QualificationBuckets = {
  confirmedThrough: string[];
  projectedStrongThrough: string[];
  projectedWeakThrough: string[];
  projectedThrough: string[];
  confirmedOut: string[];
  projectedOut: string[];
  inContention: string[];
};

function isProjectedThroughCertainty(certainty: QualificationCertainty): boolean {
  return certainty === "projected" || certainty === "projected_strong" || certainty === "projected_weak";
}

export function bucketQualificationTeams(
  teamIds: string[],
  standings: GroupStanding[],
  context: QualificationMatchContext = { lockedGroupMatchCount: {}, lockedStandingsByGroup: {} }
): QualificationBuckets {
  const buckets: QualificationBuckets = {
    confirmedThrough: [],
    projectedStrongThrough: [],
    projectedWeakThrough: [],
    projectedThrough: [],
    confirmedOut: [],
    projectedOut: [],
    inContention: []
  };

  for (const teamId of teamIds) {
    const q = computeQualificationStatus(teamId, standings, context);
    switch (q.status) {
      case "qualified":
        if (q.certainty === "confirmed") buckets.confirmedThrough.push(teamId);
        else if (q.certainty === "projected_strong") {
          buckets.projectedStrongThrough.push(teamId);
          buckets.projectedThrough.push(teamId);
        } else if (isProjectedThroughCertainty(q.certainty)) {
          buckets.projectedWeakThrough.push(teamId);
          buckets.projectedThrough.push(teamId);
        }
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

export function assertBucketMutualExclusion(buckets: QualificationBuckets): void {
  const through = new Set([...buckets.confirmedThrough, ...buckets.projectedThrough]);
  for (const teamId of buckets.inContention) {
    if (through.has(teamId)) {
      throw new Error(`Bucket mutual-exclusion violated: ${teamId} is both through and in contention`);
    }
  }
}

export function useQualificationTierFromStatus(status: QualificationStatus): QualificationTier {
  return status.status;
}

export function auditFalseConfirmations(
  standings: GroupStanding[],
  context: QualificationMatchContext
): Array<{ teamId: string; group: GroupLetter; displayPlayed: number; lockedPlayed: number; lockedMatchCount: number | undefined }> {
  const falsePositives: Array<{
    teamId: string;
    group: GroupLetter;
    displayPlayed: number;
    lockedPlayed: number;
    lockedMatchCount: number | undefined;
  }> = [];

  for (const group of standings) {
    for (let i = 0; i < Math.min(2, group.rows.length); i++) {
      const row = group.rows[i]!;
      const qual = computeQualificationStatus(row.teamId, standings, context);
      if (qual.certainty !== "confirmed") continue;

      const lockedRows = context.lockedStandingsByGroup[group.group];
      const lockedRow = lockedRows?.find((r) => r.teamId === row.teamId);
      const expectedPlayed = expectedMatchesPerTeam(group.rows.length || DEFAULT_GROUP_SIZE);
      const groupComplete =
        lockedRows !== undefined &&
        lockedRows.length > 0 &&
        lockedRows.every((r) => r.played >= expectedPlayed);
      const lockedCount = context.lockedGroupMatchCount[group.group];
      const required = matchesInGroup(group.rows.length || DEFAULT_GROUP_SIZE);

      if (
        !groupComplete ||
        (lockedRow?.played ?? 0) < expectedPlayed ||
        (lockedCount ?? 0) < required
      ) {
        falsePositives.push({
          teamId: row.teamId,
          group: group.group,
          displayPlayed: row.played,
          lockedPlayed: lockedRow?.played ?? 0,
          lockedMatchCount: lockedCount
        });
      }
    }
  }

  return falsePositives;
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
