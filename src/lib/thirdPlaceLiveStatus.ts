import type { GroupStanding, TeamRecord } from "../types";
import { APP_COPY } from "./appCopy";
import { rankAliveBestThirds } from "./bestThirds";
import { isKnockoutEliminated } from "./thirdPlaceQualification";
import type { QualificationMatchContext } from "./thirdPlaceQualification";

export type ThirdPlaceBubbleState = "safe" | "bubble" | "outside";

export type CutoffCrossing = {
  teamId: string;
  direction: "in" | "out";
};

const CUTOFF_RANK = 8;
const STRIKING_POINTS = 1;
const STRIKING_GD = 1;

function isThirdPlaceTeam(teamId: string, standings: GroupStanding[]): boolean {
  return standings.some((group) => group.rows[2]?.teamId === teamId);
}

function groupCompleteForTeam(
  teamId: string,
  standings: GroupStanding[],
  context: QualificationMatchContext
): boolean {
  for (const group of standings) {
    const idx = group.rows.findIndex((r) => r.teamId === teamId);
    if (idx < 0) continue;
    const lockedRows = context.lockedStandingsByGroup[group.group];
    const progressRows = lockedRows ?? group.rows;
    const expectedPlayed = Math.max(1, group.rows.length - 1);
    return progressRows.every((r) => r.played >= expectedPlayed);
  }
  return false;
}

function isInStrikingDistance(
  rank: number,
  row: TeamRecord,
  ranked: TeamRecord[]
): boolean {
  if (rank <= CUTOFF_RANK) return false;
  const eighth = ranked[CUTOFF_RANK - 1];
  if (!eighth) return false;
  const pointsGap = eighth.points - row.points;
  const gdGap = eighth.goalDifference - row.goalDifference;
  return pointsGap <= STRIKING_POINTS && gdGap <= STRIKING_GD;
}

/** User-facing bubble state for a third-place team on the live graph. */
export function getThirdPlaceBubbleState(
  teamId: string,
  rank: number,
  ranked: TeamRecord[],
  standings: GroupStanding[],
  context: QualificationMatchContext
): ThirdPlaceBubbleState {
  if (!isThirdPlaceTeam(teamId, standings)) {
    return "outside";
  }

  if (isKnockoutEliminated(teamId, standings, context)) {
    return "outside";
  }

  const row = ranked.find((r) => r.teamId === teamId);
  if (!row) return "outside";

  const complete = groupCompleteForTeam(teamId, standings, context);
  const nearCutoff = rank >= 7 && rank <= 10;
  const striking = isInStrikingDistance(rank, row, ranked);

  if (rank <= CUTOFF_RANK) {
    if (!complete || nearCutoff) return "bubble";
    return "safe";
  }

  if (striking || nearCutoff) return "bubble";
  return "outside";
}

export function bubbleStateLabel(state: ThirdPlaceBubbleState): string {
  switch (state) {
    case "safe":
      return APP_COPY.bestThird.safe;
    case "bubble":
      return APP_COPY.bestThird.bubble;
    case "outside":
      return APP_COPY.bestThird.outside;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/** Detect teams crossing the top-8 cutoff between two ranking snapshots. */
export function detectCutoffCrossings(
  prevRanked: TeamRecord[],
  nextRanked: TeamRecord[]
): CutoffCrossing[] {
  const crossings: CutoffCrossing[] = [];
  const allTeamIds = new Set([
    ...prevRanked.map((r) => r.teamId),
    ...nextRanked.map((r) => r.teamId),
  ]);

  for (const teamId of allTeamIds) {
    const before = prevRanked.findIndex((r) => r.teamId === teamId);
    const after = nextRanked.findIndex((r) => r.teamId === teamId);
    const rankBefore = before >= 0 ? before + 1 : prevRanked.length + 1;
    const rankAfter = after >= 0 ? after + 1 : nextRanked.length + 1;

    const wasIn = rankBefore <= CUTOFF_RANK;
    const isIn = rankAfter <= CUTOFF_RANK;

    if (!wasIn && isIn) {
      crossings.push({ teamId, direction: "in" });
    } else if (wasIn && !isIn) {
      crossings.push({ teamId, direction: "out" });
    }
  }

  return crossings;
}

/** Team IDs in the best-third bubble (near the top-8 cutoff). */
export function getBestThirdBubbleTeamIds(
  standings: GroupStanding[],
  context: QualificationMatchContext
): Set<string> {
  const ranked = rankAliveBestThirds(standings, context);
  const ids = new Set<string>();
  for (let i = 0; i < ranked.length; i += 1) {
    const row = ranked[i];
    const state = getThirdPlaceBubbleState(row.teamId, i + 1, ranked, standings, context);
    if (state === "bubble") {
      ids.add(row.teamId);
    }
  }
  return ids;
}

/** Whether a fixture involves a third-place team on the bubble. */
export function matchInvolvesBestThirdBubble(
  match: { homeTeamId: string; awayTeamId: string },
  bubbleTeamIds: Set<string>
): boolean {
  return bubbleTeamIds.has(match.homeTeamId) || bubbleTeamIds.has(match.awayTeamId);
}

export function crossedCutoffForDelta(
  positionBefore: number,
  positionAfter: number
): "in" | "out" | undefined {
  const wasIn = positionBefore <= CUTOFF_RANK;
  const isIn = positionAfter <= CUTOFF_RANK;
  if (!wasIn && isIn) return "in";
  if (wasIn && !isIn) return "out";
  return undefined;
}
