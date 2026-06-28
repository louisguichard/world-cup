/**
 * Maps shared qualification engine output to worker snapshot shape.
 * Uses the same rules as the React client (src/lib/qualification.ts).
 */

import type { GroupLetter, QualificationCertainty as ClientCertainty } from "../../../src/types.js";
import {
  buildQualificationContext,
  computeQualificationStatus,
} from "@wc2026/qualification";
import type {
  GroupQualification,
  LifeState,
  QualificationCertainty,
  QualificationTier,
} from "./qualificationWorker.types.js";

type WorkerMatch = {
  id: string;
  groupId: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  resultLocked: boolean;
  kickoffUtc: Date;
};

type WorkerStanding = {
  teamId: string;
  groupId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  goalDifference: number;
};

function toClientMatch(m: WorkerMatch) {
  return {
    id: m.id,
    group: (m.groupId ?? "A") as GroupLetter,
    date: m.kickoffUtc.toISOString(),
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    status: m.resultLocked ? ("completed" as const) : ("scheduled" as const),
    homeScore: m.homeScore ?? undefined,
    awayScore: m.awayScore ?? undefined,
    homeConduct: 0,
    awayConduct: 0,
    locked: m.resultLocked,
    source: "espn" as const,
  };
}

function standingsToGroupStanding(groupId: string, standings: WorkerStanding[]) {
  const group = groupId as GroupLetter;
  const sorted = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  return {
    group,
    rows: sorted.map((s) => ({
      teamId: s.teamId,
      group,
      played: s.played,
      wins: s.won,
      draws: s.drawn,
      losses: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDifference: s.goalDifference,
      points: s.points,
      conduct: 0,
      rating: 0,
    })),
  };
}

function mapWorkerTier(
  clientStatus: string,
  rank: number
): QualificationTier {
  if (clientStatus === "qualified") {
    return rank === 1 ? "CHAMPION" : "RUNNER_UP";
  }
  if (clientStatus === "eliminated") return "ELIMINATED";
  if (clientStatus === "at_risk") return "THIRD";
  if (clientStatus === "projected_out") return "THIRD";
  return "UNKNOWN";
}

function mapWorkerCertainty(c: ClientCertainty): QualificationCertainty {
  switch (c) {
    case "confirmed":
      return "CONFIRMED";
    case "projected_strong":
      return "LIKELY";
    case "projected_weak":
      return "POSSIBLE";
    case "projected":
      return "UNCERTAIN";
    default:
      return "UNCERTAIN";
  }
}

function mapWorkerLifeState(lifeState: string): LifeState {
  return lifeState === "eliminated" ? "ELIMINATED" : "ALIVE";
}

export function computeGroupQualificationFromSharedEngine(
  groupId: string,
  standings: WorkerStanding[],
  matches: WorkerMatch[]
): GroupQualification[] {
  const clientMatches = matches.map(toClientMatch);
  const groupStanding = standingsToGroupStanding(groupId, standings);
  const allStandings = [groupStanding];
  const context = buildQualificationContext(clientMatches);

  return groupStanding.rows.map((row, index) => {
    const qual = computeQualificationStatus(row.teamId, allStandings, context);
    const rank = index + 1;
    const tier = mapWorkerTier(qual.status, rank);
    const certainty = mapWorkerCertainty(qual.certainty);
    const lifeState = mapWorkerLifeState(qual.lifeState);

    return {
      teamId: row.teamId,
      groupId,
      tier,
      certainty,
      lifeState,
      projectionScore: qual.projectionScore,
      reasons: qual.reason ? [qual.reason] : [`Position ${rank} in group`],
    };
  });
}
