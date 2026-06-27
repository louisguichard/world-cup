import type { GroupStanding, Team, TeamRecord } from "../types";
import { APP_COPY } from "./appCopy";
import { compareThirdPlaceTeams } from "./thirdPlaceRanking";
import type { QualificationMatchContext } from "./thirdPlaceQualification";

const CUTOFF_RANK = 8;

export type CutoffWatchTeam = {
  teamId: string;
  rank: number;
  points: number;
  goalDifference: number;
  goalsFor: number;
};

export type CutoffScenario = {
  teamId: string;
  rank: number;
  points: number;
  goalDifference: number;
  goalsFor: number;
  proseLines: string[];
  keepSummary: string;
  knockOutBullets: string[];
  minDropSummary: string;
  watchTeams: CutoffWatchTeam[];
};

function strikingTeamsBelow(
  teamId: string,
  ranked: TeamRecord[]
): CutoffWatchTeam[] {
  const idx = ranked.findIndex((r) => r.teamId === teamId);
  if (idx < 0) return [];
  const row = ranked[idx]!;
  const watch: CutoffWatchTeam[] = [];

  for (let i = idx + 1; i < Math.min(ranked.length, idx + 4); i += 1) {
    const below = ranked[i]!;
    const pointsGap = row.points - below.points;
    const gdGap = row.goalDifference - below.goalDifference;
    if (pointsGap <= 1 && gdGap <= 1) {
      watch.push({
        teamId: below.teamId,
        rank: i + 1,
        points: below.points,
        goalDifference: below.goalDifference,
        goalsFor: below.goalsFor,
      });
    }
  }

  return watch.slice(0, 3);
}

function buildKnockOutBullets(watchTeams: CutoffWatchTeam[]): string[] {
  if (watchTeams.length === 0) {
    return ["A team below could still pass you on points, goal difference, or goals scored."];
  }
  return watchTeams.map(
    (t) =>
      `#${t.rank} with ${t.points} pts, ${t.goalDifference >= 0 ? "+" : ""}${t.goalDifference} GD — a win could push them past you`
  );
}

function buildMinDropSummary(row: TeamRecord, ranked: TeamRecord[]): string {
  const ninth = ranked[CUTOFF_RANK];
  if (!ninth) return "Drop below the team in 9th on tiebreakers.";
  const ptsMatch = row.points === ninth.points;
  const gdMatch = row.goalDifference === ninth.goalDifference;
  if (ptsMatch && gdMatch) {
    return `Losing the goals-scored tiebreaker (${row.goalsFor} vs ${ninth.goalsFor}) could drop you out.`;
  }
  if (ptsMatch) {
    return `A worse goal difference than ${ninth.goalDifference >= 0 ? "+" : ""}${ninth.goalDifference} at the same points would drop you out.`;
  }
  return `Falling to ${row.points - 1} points or fewer could drop you below the cutoff.`;
}

/** Build plain-language cutoff scenario for a third-place team (especially rank 8). */
export function buildThirdPlaceCutoffScenario(
  teamId: string,
  ranked: TeamRecord[],
  _standings: GroupStanding[],
  _context: QualificationMatchContext
): CutoffScenario | null {
  const idx = ranked.findIndex((r) => r.teamId === teamId);
  if (idx < 0) return null;

  const rank = idx + 1;
  const row = ranked[idx]!;
  const cp = APP_COPY.cutoffPopover;
  const watchTeams = strikingTeamsBelow(teamId, ranked);

  const keepSummary = `Hold ${row.points} points and ${row.goalDifference >= 0 ? "+" : ""}${row.goalDifference} goal difference.`;

  return {
    teamId,
    rank,
    points: row.points,
    goalDifference: row.goalDifference,
    goalsFor: row.goalsFor,
    proseLines: [
      cp.title,
      cp.rankLine(rank),
      cp.safeNotLocked,
      cp.holdLine,
      cp.dropLine,
      cp.watchLine,
    ],
    keepSummary,
    knockOutBullets: buildKnockOutBullets(watchTeams),
    minDropSummary: buildMinDropSummary(row, ranked),
    watchTeams,
  };
}

/** Ranked third-place teams sorted by FIFA tiebreakers (for tests). */
export function sortThirdPlaceRanked(records: TeamRecord[]): TeamRecord[] {
  return [...records].sort(compareThirdPlaceTeams);
}

export { CUTOFF_RANK };
