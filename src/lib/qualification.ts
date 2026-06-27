import type {
  GroupLetter,
  GroupStanding,
  LifeState,
  Match,
  MatchWithScore,
  QualificationCertainty,
  QualificationStatus,
  QualificationTier,
  ScoreOverride,
  Team,
  TeamRecord
} from "../types";
import {
  isKnockoutEliminated,
  rankAliveBestThirds,
  thirdPlaceRankAmongAlive
} from "./thirdPlaceQualification";
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

function projectionScoreForTopTwo(
  row: TeamRecord,
  rows: TeamRecord[],
  expectedPlayed: number,
  confirmed: boolean
): number {
  if (confirmed) return 100;
  const remaining = Math.max(0, expectedPlayed - row.played);
  const third = rows[2];
  const gapToThird = row.points - (third?.points ?? 0);
  if (gapToThird > remaining * 3) return 92;
  if (remaining <= 1 && gapToThird > 3) return 82;
  if (remaining <= 1 && gapToThird > 1) return 68;
  return 55;
}

function projectionScoreForThird(
  aliveRank: number,
  inTopEight: boolean,
  groupComplete: boolean,
  eliminated: boolean
): number {
  if (eliminated || aliveRank < 0) return 0;
  if (groupComplete && inTopEight) return 88;
  if (inTopEight) return Math.max(45, 90 - aliveRank * 5);
  return Math.max(8, 28 - Math.max(0, aliveRank - 7) * 4);
}

function finalizeStatus(
  status: QualificationTier,
  certainty: QualificationCertainty,
  projectionScore: number,
  reason: string,
  opts: {
    canQualify?: boolean;
    lifeState?: LifeState;
    eliminationReason?: string;
    pointsNeeded?: number;
  } = {}
): QualificationStatus {
  const canQualify = opts.canQualify ?? projectionScore > 0;
  const lifeState: LifeState =
    opts.lifeState ?? (canQualify ? (status === "qualified" ? "projected" : "alive") : "eliminated");

  return {
    status,
    certainty,
    lifeState,
    canQualify,
    projectionScore: canQualify ? projectionScore : 0,
    reason,
    eliminationReason: opts.eliminationReason,
    pointsNeeded: opts.pointsNeeded
  };
}

/** @deprecated Rule-based confidence replaced sigmoid; returns 0–1 for legacy callers only. */
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
    const progressRows = lockedRows !== undefined ? lockedRows : rows;
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

    const eliminated = isKnockoutEliminated(teamId, standings, context);

    if (rank <= 2) {
      const confirmed = isConfirmedTopTwo(row, rows, confirmOpts);
      const score = projectionScoreForTopTwo(row, rows, expectedPlayed, confirmed);
      return finalizeStatus(
        "qualified",
        confirmed ? "confirmed" : projectedCertaintyTier(row, rows, expectedPlayed),
        score,
        confirmed
          ? "Mathematically locked into the top two — will advance regardless of remaining results."
          : "Currently in the top two, but other teams can still overtake them.",
        { canQualify: true, lifeState: confirmed ? "projected" : "alive" }
      );
    }

    if (eliminated) {
      const eliminationReason =
        rank === 4 && groupComplete
          ? "Finished fourth in the group — eliminated."
          : rank === 3 && groupComplete
            ? "Finished third — did not rank among the best eight third-placed teams."
            : rank === 4 && third && teamMax < third.points
              ? "Cannot reach third place even with maximum points — no knockout path remains."
              : rank === 4 && second && teamMax < second.points
                ? "Cannot reach the top two even with maximum points."
                : "No remaining path to the knockout round.";

      return finalizeStatus("eliminated", "confirmed", 0, eliminationReason, {
        canQualify: false,
        lifeState: "eliminated",
        eliminationReason
      });
    }

    if (rank === 3) {
      const aliveRank = thirdPlaceRankAmongAlive(teamId, standings, context);
      const inTopEight = aliveRank >= 0 && aliveRank < 8;
      const score = projectionScoreForThird(aliveRank, inTopEight, groupComplete, false);
      const gapToSecond = (second?.points ?? 0) - row.points;

      if (groupComplete) {
        return finalizeStatus("at_risk", "confirmed", score, "Confirmed third — awaiting best-third cut after all groups finish.", {
          canQualify: true,
          lifeState: "projected",
          pointsNeeded: gapToSecond > 0 ? gapToSecond : undefined
        });
      }

      if (inTopEight) {
        return finalizeStatus(
          "at_risk",
          "projected_weak",
          score,
          "Third place — currently in the best-eight third-placed projection, but not guaranteed until all groups finish.",
          { canQualify: true, lifeState: "alive", pointsNeeded: gapToSecond > 0 ? gapToSecond : undefined }
        );
      }

      return finalizeStatus(
        "at_risk",
        "projected_weak",
        score,
        "Third place — must improve points or goal difference to reach the best-eight third-placed cut.",
        { canQualify: true, lifeState: "alive", pointsNeeded: gapToSecond > 0 ? gapToSecond : undefined }
      );
    }

    if (rank === 4) {
      return finalizeStatus(
        "pending",
        "projected_weak",
        22,
        "Fourth place — must win out and need other results to climb the table.",
        { canQualify: true, lifeState: "alive" }
      );
    }

    return finalizeStatus(
      "pending",
      "projected_weak",
      30,
      "Still fighting for position — outcome depends on remaining matches.",
      { canQualify: true, lifeState: "alive" }
    );
  }

  return finalizeStatus("pending", "projected_weak", 0, "Group standings not available yet.", {
    canQualify: false,
    lifeState: "alive"
  });
}

export { rankAliveBestThirds } from "./thirdPlaceQualification";

export type ProjectionViolation = {
  teamId: string;
  issue: string;
  status: QualificationStatus;
};

/** Audit helper: eliminated teams must never show as projected-through. */
export function auditProjectionViolations(
  teamIds: string[],
  standings: GroupStanding[],
  context: QualificationMatchContext = { lockedGroupMatchCount: {}, lockedStandingsByGroup: {} }
): ProjectionViolation[] {
  const violations: ProjectionViolation[] = [];
  const aliveBest = rankAliveBestThirds(standings, context);
  const topEightIds = new Set(aliveBest.slice(0, 8).map((r) => r.teamId));

  for (const teamId of teamIds) {
    const q = computeQualificationStatus(teamId, standings, context);

    if (!q.canQualify && (q.lifeState === "projected" || q.status === "qualified")) {
      violations.push({ teamId, issue: "eliminated_shown_as_projected", status: q });
    }
    if (!q.canQualify && q.projectionScore > 0) {
      violations.push({ teamId, issue: "positive_score_when_eliminated", status: q });
    }
    if (topEightIds.has(teamId) && q.status === "projected_out") {
      violations.push({ teamId, issue: "top_eight_shown_projected_out", status: q });
    }
    if (q.canQualify && q.status === "eliminated") {
      violations.push({ teamId, issue: "alive_shown_eliminated", status: q });
    }
  }

  return violations;
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
        buckets.confirmedOut.push(teamId);
        break;
      case "at_risk":
      case "pending":
        buckets.inContention.push(teamId);
        break;
      case "projected_out":
        if (q.canQualify) buckets.projectedOut.push(teamId);
        else buckets.confirmedOut.push(teamId);
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
