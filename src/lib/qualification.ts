import type { GroupStanding, MatchWithScore, QualificationStatus, QualificationTier, ScoreOverride, Team } from "../types";
import { computeStandings } from "./tournament";

export function deriveStandings(
  matches: MatchWithScore[],
  teams: Team[],
  _overrides: Record<string, ScoreOverride> = {}
): GroupStanding[] {
  return computeStandings(matches, teams);
}

export function computeEliminationProbability(pointsGap: number, matchesRemaining: number): number {
  const x = -0.35 * pointsGap - 0.15 * matchesRemaining;
  return 1 / (1 + Math.exp(-x));
}

export function computeQualificationStatus(
  teamId: string,
  standings: GroupStanding[],
  matchesRemaining: number
): QualificationStatus {
  for (const group of standings) {
    const idx = group.rows.findIndex((r) => r.teamId === teamId);
    if (idx < 0) continue;

    const rank = idx + 1;
    const row = group.rows[idx]!;
    const leaderPoints = group.rows[0]?.points ?? 0;
    const secondPoints = group.rows[1]?.points ?? 0;
    const thirdPoints = group.rows[2]?.points ?? 0;

    if (rank <= 2 && row.points >= secondPoints) {
      return { status: "qualified" };
    }

    const maxPossible = row.points + matchesRemaining * 3;
    if (maxPossible < thirdPoints) {
      return { status: "eliminated" };
    }

    if (rank === 3) {
      const gapToSecond = secondPoints - row.points;
      const prob = computeEliminationProbability(gapToSecond, matchesRemaining);
      if (prob < 0.35) return { status: "at_risk", eliminationProbability: prob, pointsNeeded: gapToSecond };
      return { status: "projected_out", eliminationProbability: prob };
    }

    if (rank === 4) {
      return { status: "eliminated" };
    }

    const gap = leaderPoints - row.points;
    if (gap > matchesRemaining * 3) {
      return { status: "eliminated" };
    }

    return { status: "pending" };
  }

  return { status: "pending" };
}

export function useQualificationTierFromStatus(status: QualificationStatus): QualificationTier {
  return status.status;
}

export function groupStageComplete(matches: Array<{ group?: string; status: string }>): boolean {
  const groupMatches = matches.filter((m) => m.group);
  const completed = groupMatches.filter((m) => m.status === "completed");
  return completed.length >= 72;
}
